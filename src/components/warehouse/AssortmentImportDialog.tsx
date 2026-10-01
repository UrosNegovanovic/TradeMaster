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
  ASSORTMENT_TEMPLATE_CSV,
  downloadTextFile,
  parseAssortmentGrid,
  readSpreadsheetRows,
  type AssortmentPayload,
  type AssortmentPreviewRow,
} from '@/lib/assortment-import'
import { sr } from '@/lib/ui-copy'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'

type Category = { id: string; name: string }

type ConfirmResult = {
  line: number
  sku: string
  ok: boolean
  status?: number
  error?: string
}

interface AssortmentImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) return []
  return response.json()
}

async function resolveCategoryId(
  name: string | undefined,
  cache: Map<string, string>,
  request: SessionFetch
): Promise<string | undefined> {
  if (!name) return undefined
  const key = name.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const created = await request('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() }),
  })
  if (created.ok) {
    const category = (await created.json()) as Category
    cache.set(key, category.id)
    return category.id
  }
  if (created.status === 409) {
    const categories = await fetchCategories()
    for (const category of categories) {
      cache.set(category.name.trim().toLowerCase(), category.id)
    }
    return cache.get(key)
  }
  return undefined
}

async function postIntake(payload: AssortmentPayload, categoryId: string | undefined, request: SessionFetch) {
  const body: Record<string, unknown> = {
    name: payload.name,
    sku: payload.sku,
    quantity: payload.quantity,
    price: payload.price,
  }
  if (payload.costPrice !== undefined) body.costPrice = payload.costPrice
  if (categoryId) body.categoryId = categoryId

  const response = await request('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Unos proizvoda nije uspeo')
  }
  return { status: response.status, json }
}

export function AssortmentImportDialog({
  open,
  onOpenChange,
  onCompleted,
}: AssortmentImportDialogProps) {
  const request = useAuthorizedFetch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<AssortmentPreviewRow[]>([])
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
      const parsed = parseAssortmentGrid(grid)
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

    const categories = await fetchCategories()
    const cache = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category.id]))
    const nextResults: ConfirmResult[] = []

    for (const row of toSend) {
      const payload = row.payload!
      try {
        const categoryId = await resolveCategoryId(payload.categoryName, cache, request)
        const { status } = await postIntake(payload, categoryId, request)
        nextResults.push({ line: row.line, sku: payload.sku, ok: true, status })
      } catch (error) {
        nextResults.push({
          line: row.line,
          sku: payload.sku,
          ok: false,
          error: error instanceof Error ? error.message : 'Unos nije uspeo',
        })
      }
      setProgress({ done: nextResults.length, total: toSend.length })
      setResults([...nextResults])
    }

    setIsSubmitting(false)
    onCompleted?.()
    const failed = nextResults.filter((result) => !result.ok).length
    const created = nextResults.filter((result) => result.status === 201).length
    const updated = nextResults.filter((result) => result.status === 200).length
    if (failed === 0) {
      notify.success('Uvoz asortimana je završen', {
        description: `${created} novih, ${updated} dopunjenih. ${invalidRows.length} neispravnih redova nije poslato.`,
      })
    } else {
      notify.error('Uvoz je delimično uspeo', {
        description: `${nextResults.length - failed} uspešno, ${failed} grešaka.`,
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
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Uvezi iz CSV/Excel</DialogTitle>
          <DialogDescription>
            Novi asortiman. Svaki ispravan red ide redom kroz postojeći unos proizvoda (isti SKU istog dana
            dodaje količinu). Neispravni redovi su označeni i ne šalju se.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadTextFile('trademaster-asortiman.csv', ASSORTMENT_TEMPLATE_CSV)}
            >
              <Download className="mr-2 h-4 w-4" />
              Preuzmi template
            </Button>
            <p className="text-xs text-muted-foreground">
              Kolone: naziv, sku, kolicina, cena, nabavna_cena, kategorija. Cena i kategorija su
              opcione; nabavna cena je obavezna (0 samo u formi proizvoda, uz razlog).
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assortment-file">CSV ili Excel fajl</Label>
            <Input
              id="assortment-file"
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
                      <TableHead>Naziv</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Količina</TableHead>
                      <TableHead>Cena</TableHead>
                      <TableHead>Nabavna</TableHead>
                      <TableHead>Kategorija</TableHead>
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
                        <TableCell>{row.display.naziv || '—'}</TableCell>
                        <TableCell>{row.display.sku || '—'}</TableCell>
                        <TableCell>{row.display.kolicina || '—'}</TableCell>
                        <TableCell>{row.display.cena || '—'}</TableCell>
                        <TableCell>{row.display.nabavna_cena || '—'}</TableCell>
                        <TableCell>{row.display.kategorija || '—'}</TableCell>
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
            Potvrdi uvoz ({validRows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
