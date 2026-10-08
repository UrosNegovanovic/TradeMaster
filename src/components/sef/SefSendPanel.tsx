'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SefStatusBadge } from '@/components/sef/SefStatusBadge'
import { notify } from '@/lib/notify'
import { formatRsd } from '@/lib/invoice-finance'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SefStatus } from '@/lib/sef-status'
import { sr } from '@/lib/ui-copy'

type SefFix = { href: string; label: string } | null
type SefPanelData = {
  enabled: boolean
  refusal: string | null
  confirm: { invoiceNumber: string; clientName: string; totalAmount: string | number }
  state: {
    status: SefStatus | null
    comment: string | null
    sentAt: string | null
    checkedAt: string | null
    lastError: string | null
    sefInvoiceId: string | null
  }
  refreshable?: boolean
  refreshError?: string | null
  precheck: { problems: string[]; buyerRegistered: boolean | null } | null
}

/**
 * "Pošalji u SEF" on the invoice page (ROADMAP A3): one tap, a confirmation with amount and buyer,
 * then the status badge. Hidden unless the company saved a SEF API key.
 */
export function SefSendPanel({ invoiceId }: { invoiceId: string }) {
  const request = useAuthorizedFetch()
  const queryClient = useQueryClient()
  const queryKey = ['invoice-sef', invoiceId]
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'send' | 'refresh' | null>(null)
  const [error, setError] = useState<{ message: string; fix: SefFix; problems?: string[] } | null>(null)

  const { data } = useQuery<SefPanelData>({
    queryKey,
    // Opening the invoice refreshes a status SEF can still change; final ones cost no SEF call.
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/sef?refresh=auto`, { cache: 'no-store' })
      if (!response.ok) throw new Error('SEF stanje nije učitano')
      return response.json()
    },
    refetchOnWindowFocus: false,
  })

  if (!data || (!data.enabled && !data.state.status) || data.refusal) return null
  const { state } = data

  async function send() {
    setBusy('send')
    setError(null)
    try {
      const response = await request(`/api/invoices/${invoiceId}/sef`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string; fix?: SefFix; problems?: string[] }
        | null
      if (response.ok && body?.message) {
        notify.success(body.message)
        setOpen(false)
      } else {
        setError({ message: body?.error ?? 'Slanje nije uspelo.', fix: body?.fix ?? null, problems: body?.problems })
      }
    } catch {
      setError({ message: 'Veza je prekinuta. Pokušajte ponovo; faktura se neće poslati dvaput.', fix: null })
    } finally {
      setBusy(null)
      await queryClient.invalidateQueries({ queryKey })
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
  }

  async function refresh() {
    setBusy('refresh')
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/sef?refresh=1`, { cache: 'no-store' })
      if (response.ok) {
        const fresh = (await response.json()) as SefPanelData
        queryClient.setQueryData(queryKey, fresh)
        if (fresh.refreshError) notify.error('Status nije osvežen', { description: fresh.refreshError })
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      }
    } finally {
      setBusy(null)
    }
  }

  const problems = data.precheck?.problems ?? []
  const buyerNotOnSef = data.precheck?.buyerRegistered === false

  return (
    <section aria-label="SEF" className="mb-6 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">SEF</h2>
        <SefStatusBadge status={state.status} />
      </div>

      {state.status === 'REJECTED' && state.comment ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">Razlog kupca:</span> {state.comment}
        </p>
      ) : state.comment && (state.status === 'STORNO' || state.status === 'CANCELLED') ? (
        <p className="mt-2 text-sm text-muted-foreground">{state.comment}</p>
      ) : null}

      {state.status === 'SENDING' && state.lastError ? (
        <p className="mt-2 text-sm text-amber-800">{state.lastError}</p>
      ) : null}
      {!state.status && state.lastError ? (
        <p className="mt-2 text-sm text-destructive">Prethodno slanje: {state.lastError}</p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!state.status || state.status === 'SENDING' ? (
          <Button className="min-h-11 w-full sm:w-auto" onClick={() => setOpen(true)} disabled={busy !== null || !data.enabled}>
            <Send className="mr-2 h-4 w-4" />
            {state.status === 'SENDING' ? 'Pošalji ponovo' : 'Pošalji u SEF'}
          </Button>
        ) : null}
        {data.refreshable ? (
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={refresh} disabled={busy !== null}>
            {busy === 'refresh' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Osveži status
          </Button>
        ) : null}
      </div>
      {state.status && state.status !== 'SENDING' ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Poslata u SEF faktura se ovde više ne menja ni ne briše; ispravka ide stornom na SEF portalu.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={(value) => (busy ? null : setOpen(value))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pošalji fakturu {data.confirm.invoiceNumber} u SEF?</DialogTitle>
            <DialogDescription>Posle slanja faktura se više ne menja ovde.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Kupac</dt>
            <dd className="break-words font-medium">{data.confirm.clientName}</dd>
            <dt className="text-muted-foreground">Iznos</dt>
            <dd className="font-medium tabular-nums">{formatRsd(Number(data.confirm.totalAmount))}</dd>
          </dl>

          {problems.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium">Pre slanja dopunite:</p>
              <ul className="mt-1 list-disc pl-5">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">{sr.sef.problemsHint}</p>
            </div>
          ) : buyerNotOnSef ? (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Kupac sa ovim PIB-om nije registrovan u SEF-u, pa će SEF verovatno odbiti fakturu. Proverite PIB na
                fakturi ili pitajte kupca da li koristi SEF.
              </p>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="space-y-1 text-sm text-destructive">
              <p>{error.message}</p>
              {error.problems?.length ? (
                <ul className="list-disc pl-5">
                  {error.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              ) : null}
              {error.fix ? (
                <Link href={error.fix.href} className="font-medium underline">
                  {error.fix.label}
                </Link>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)} disabled={busy !== null}>
              Otkaži
            </Button>
            <Button className="min-h-11" onClick={send} disabled={busy !== null || problems.length > 0}>
              {busy === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {buyerNotOnSef ? 'Pošalji svejedno' : 'Pošalji'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
