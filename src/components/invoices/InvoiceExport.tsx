'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import { addLocalMonths, formatLocalYmd, startOfLocalMonth } from '@/lib/local-date'

type ExportFormat = 'csv' | 'xlsx'

function defaultPeriod() {
  const monthStart = startOfLocalMonth()
  return {
    from: formatLocalYmd(monthStart),
    // Last day of the current month = day before next month's start.
    to: formatLocalYmd(new Date(addLocalMonths(monthStart, 1).getTime() - 12 * 60 * 60 * 1000)),
  }
}

/** Accountant export: invoices issued in a period, as CSV or XLSX. */
export function InvoiceExport() {
  const request = useAuthorizedFetch()
  const [period, setPeriod] = useState(defaultPeriod)
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  const download = async (format: ExportFormat) => {
    setBusy(format)
    try {
      const query = new URLSearchParams({ from: period.from, to: period.to, format })
      const response = await request(`/api/invoices/export?${query}`)
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Izvoz nije uspeo'))
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fakture_${period.from}_${period.to}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      notify.error('Izvoz nije uspeo', {
        description: error instanceof Error ? error.message : 'Pokušajte ponovo.',
        duration: 5000,
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div>
          <p className="font-medium">Izvoz za knjigovođu</p>
          <p className="text-sm text-muted-foreground">
            Izdate fakture (bez nacrta) po datumu izdavanja: broj, kupac, PIB, status, osnovica, PDV i ukupno.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor="exportFrom">Od</Label>
            <Input
              id="exportFrom"
              type="date"
              value={period.from}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="exportTo">Do</Label>
            <Input
              id="exportTo"
              type="date"
              value={period.to}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            />
          </div>
          {(['xlsx', 'csv'] as const).map((format) => (
            <Button
              key={format}
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={busy !== null || !period.from || !period.to}
              onClick={() => download(format)}
            >
              {busy === format ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {format.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
