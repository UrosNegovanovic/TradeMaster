'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, MessageCircle, Phone, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildShareTargets } from '@/lib/share-links'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'

type ShareState = { url: string | null }

type ShareLinkPanelProps = {
  /** Owner API with GET (state), POST (new link) and DELETE (revoke). */
  endpoint: string
  queryKey: readonly unknown[]
  /** Accepts only the expected relative share path; anything else is treated as a broken response. */
  parsePath: (value: unknown) => string | null
  label: string
  description: string
  /** Lead text of the WhatsApp / Viber / e-mail message; the link is appended. */
  shareText: string
  shareSubject: string
  /** When set, sharing is unavailable and this explains why (e.g. a draft invoice). */
  unavailableReason?: string
}

export function ShareLinkPanel({ endpoint, queryKey, parsePath, label, description, shareText, shareSubject, unavailableReason }: ShareLinkPanelProps) {
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [canNativeShare, setCanNativeShare] = useState(false)
  useEffect(() => setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), [])

  function parseShareState(value: unknown): ShareState {
    if (!value || typeof value !== 'object') throw new Error('Odgovor za deljenje nije ispravan.')
    const rawUrl = (value as { url?: unknown }).url
    if (rawUrl === null) return { url: null }
    const url = parsePath(rawUrl)
    if (!url) throw new Error('Odgovor za deljenje nije ispravan.')
    return { url }
  }

  const { data, isLoading, error } = useQuery<ShareState>({
    queryKey,
    enabled: !unavailableReason,
    queryFn: async () => {
      const response = await fetch(endpoint, { cache: 'no-store' })
      if (!response.ok) throw new Error('Deljenje nije dostupno.')
      return parseShareState(await response.json())
    },
  })

  async function change(method: 'POST' | 'DELETE') {
    setBusy(true)
    setMessage('')
    try {
      const response = await request(endpoint, { method })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: unknown } | null
        throw new Error(response.status === 409 && typeof body?.error === 'string' ? body.error : 'Promena deljenja nije uspela. Pokušajte ponovo.')
      }
      queryClient.setQueryData(queryKey, parseShareState(await response.json()))
      setMessage(method === 'DELETE' ? 'Link je opozvan.' : 'Novi link je spreman. Prethodni link više ne važi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deljenje nije dostupno.')
      // A lost response may follow a successful write. Refetch the actual state.
      await queryClient.invalidateQueries({ queryKey })
    } finally { setBusy(false) }
  }

  const url = unavailableReason ? null : data?.url ?? null
  const absoluteUrl = url && typeof window !== 'undefined' ? new URL(url, window.location.origin).href : null
  const targets = absoluteUrl ? buildShareTargets({ url: absoluteUrl, text: shareText, subject: shareSubject }) : null

  return (
    <section aria-label={label} className="mb-6 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Link za kupca</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {unavailableReason ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">{unavailableReason}</p>
      ) : <>
        {absoluteUrl && targets && (
          <div className="mt-3 flex flex-wrap gap-2">
            {canNativeShare && (
              <Button className="min-h-11" disabled={busy} onClick={async () => {
                try { await navigator.share({ title: shareSubject, text: shareText, url: absoluteUrl }) }
                catch { /* the user closed the share sheet */ }
              }}><Share2 className="mr-2 h-4 w-4" />Podeli</Button>
            )}
            <Button asChild variant="outline" className="min-h-11"><a href={targets.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>
            <Button asChild variant="outline" className="min-h-11"><a href={targets.viber}><Phone className="mr-2 h-4 w-4" />Viber</a></Button>
            <Button asChild variant="outline" className="min-h-11"><a href={targets.email}><Mail className="mr-2 h-4 w-4" />Mejl</a></Button>
            <Button variant="outline" className="min-h-11" disabled={busy} onClick={async () => {
              try { await navigator.clipboard.writeText(absoluteUrl); setMessage('Link je kopiran.') }
              catch { setMessage('Otvorite pregled i kopirajte adresu iz browsera.') }
            }}>Kopiraj link</Button>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {url && <>
            <Button asChild variant="ghost" className="min-h-11"><a href={url} target="_blank" rel="noopener noreferrer">Pregled za kupca</a></Button>
            <Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => change('DELETE')}>Opozovi link</Button>
          </>}
          <Button variant={url ? 'ghost' : 'default'} className="min-h-11" disabled={busy || isLoading || !!error} onClick={() => change('POST')}>
            {busy ? 'Obrada…' : url ? 'Napravi novi link' : 'Uključi deljenje'}
          </Button>
        </div>
        <p role="status" className="mt-2 text-sm text-muted-foreground">{message || (error ? 'Deljenje trenutno nije dostupno.' : !isLoading && !url ? 'Deljenje je isključeno.' : '')}</p>
      </>}
    </section>
  )
}
