'use client'

import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { notify } from '@/lib/notify'
import {
  downloadTextFile,
  parseStockAdjustGrid,
  readSpreadsheetRows,
  STOCK_ADJUST_TEMPLATE_CSV,
  type StockAdjustPreviewRow,
} from '@/lib/assortment-import'
import { sr } from '@/lib/ui-copy'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'

type ConfirmResult = {
  line: number
  sku: string
  ok: boolean
  error?: string
}

interface StockAdjustImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function StockAdjustImportDialog({
  open,
  onOpenChange,
  onCompleted,
}: StockAdjustImportDialogProps) {
  const request = useAuthorizedFetch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<StockAdjustPreviewRow[]>([])
  const [isReading, setIsReading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<ConfirmResult[] | null>(null)

  const validRows = rows.filter((row) => row.valid)
  const invalidRows = rows.filter((row) => !row.valid)

  function resetState() {
    setFileName(null)
    setParseError(null)
    setRows([])
    setProgress(null)
    setResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setIsReading(true)
    setParseError(null)
    setResults(null)
    setProgress(null)
    try {
      const grid = await readSpreadsheetRows(file)
      const parsed = parseStockAdjustGrid(grid)
      if ('error' in parsed) {
        setRows([])
        setParseError(parsed.error)
        setFileName(file.name)
        return
      }
      setFileName(file.name)
      setRows(parsed.rows)
    } catch (error) {
      setRows([])
      setParseError(error instanceof Error ? error.message : 'Fajl nije moguće pročitati.')
    } finally {
      setIsReading(false)
    }
  }

  async function handleConfirm() {
    const toSend = rows.filter((row) => row.valid && row.payload)
    if (toSend.length === 0) return
    setIsSubmitting(true)
    setResults(null)
    setProgress({ done: 0, total: toSend.length })
    const nextResults: ConfirmResult[] = []

    for (const row of toSend) {
      const payload = row.payload!
      try {
        const response = await request('/api/products/bulk-adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: payload.sku, quantity: payload.quantity }),
        })
        const json = await response.json().catch(() => ({}))
        if (!response.ok) {
          nextResults.push({
            line: row.line,
            sku: payload.sku,
            ok: false,
            error: typeof json.error === 'string' ? json.error : 'Korekcija nije uspela',
          })
        } else {
          nextResults.push({ line: row.line, sku: payload.sku, ok: true })
        }
      } catch (error) {
        nextResults.push({
          line: row.line,
          sku: payload.sku,
          ok: false,
          error: error instanceof Error ? error.message : 'Korekcija nije uspela',
        })
      }
      setProgress({ done: nextResults.length, total: toSend.length })
      setResults([...nextResults])
    }

    setIsSubmitting(false)
    onCompleted?.()
    const failed = nextResults.filter((result) => !result.ok).length
    if (failed === 0) {
      notify.success('Stanje je ažurirano', {
        description: `${nextResults.length} SKU-ova. ${invalidRows.length} neispravnih redova nije poslato.`,
      })
    } else {
      notify.error('Ažuriranje je delimično uspelo', {
        description: `${nextResults.length - failed} uspešno, ${failed} preskočeno.`,
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return
        if (!next) resetState()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ažuriraj stanje</DialogTitle>
          <DialogDescription>
            Korekcija količine postojećih proizvoda. Kolona kolicina je novo stanje (nije dodavanje). Cena i
            nabavna cena se ne menjaju. Ako isti SKU postoji na više dnevnih unosa, red se preskače.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadTextFile('trademaster-stanje.csv', STOCK_ADJUST_TEMPLATE_CSV)}
            >
              <Download className="mr-2 h-4 w-4" />
              Preuzmi template
            </Button>
            <p className="text-xs text-muted-foreground">Kolone: sku, kolicina. Proizvod se ne kreira ako SKU ne postoji.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stock-adjust-file">CSV ili Excel fajl</Label>
            <Input
              id="stock-adjust-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={isReading || isSubmitting}
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            {fileName && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {fileName}
              </p>
            )}
          </div>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm">
                Pregled: <strong>{validRows.length}</strong> za slanje,{' '}
                <strong className="text-destructive">{invalidRows.length}</strong> neispravnih (ne šalju se).
              </p>
              <div className="max-h-[320px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Red</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Novo stanje</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.line}
                        className={row.valid ? undefined : 'bg-destructive/10 text-destructive'}
                      >
                        <TableCell>{row.line}</TableCell>
                        <TableCell>{row.display.sku || '—'}</TableCell>
                        <TableCell>{row.display.kolicina || '—'}</TableCell>
                        <TableCell>
                          {row.valid ? 'Spreman' : row.issues.map((issue) => issue.message).join('; ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {progress && (
            <p className="text-sm font-medium">
              {progress.done}/{progress.total} obrađeno
            </p>
          )}

          {results && results.some((result) => !result.ok) && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
              {results
                .filter((result) => !result.ok)
                .map((result) => (
                  <li key={`${result.line}-${result.sku}`}>
                    Red {result.line} ({result.sku}): {result.error}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {sr.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || isReading || validRows.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Potvrdi korekciju ({validRows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
