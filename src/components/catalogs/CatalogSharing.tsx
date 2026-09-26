'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

export function CatalogSharing({ catalogId }: { catalogId: string }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const endpoint = `/api/catalogs/${catalogId}/share`
  const queryKey = ['catalog-sharing', catalogId]
  const { data, isLoading, error } = useQuery<{ url: string | null }>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(endpoint, { cache: 'no-store' })
      if (!response.ok) throw new Error('Deljenje nije dostupno.')
      return response.json()
    },
  })

  async function change(method: 'POST' | 'DELETE') {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(endpoint, { method })
      if (!response.ok) throw new Error('Promena deljenja nije uspela. Pokušajte ponovo.')
      queryClient.setQueryData(queryKey, await response.json())
      setMessage(method === 'DELETE' ? 'Link je opozvan.' : 'Novi link je spreman. Prethodni link više ne važi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deljenje nije dostupno.')
      // A lost response may follow a successful write. Refetch the actual state.
      await queryClient.invalidateQueries({ queryKey })
    } finally { setBusy(false) }
  }

  return (
    <section aria-label="Deljenje kataloga" className="mb-6 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Link za kupca</h2>
      <p className="mt-1 text-sm text-muted-foreground">Svako ko dobije uključen link može da vidi ponudu, ime klijenta, beleške i kontakt firme. Stanje lagera se ne prikazuje.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data?.url && <>
          <Button asChild variant="outline" className="min-h-11"><a href={data.url} target="_blank" rel="noopener noreferrer">Pregled za kupca</a></Button>
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={async () => {
            try { await navigator.clipboard.writeText(new URL(data.url!, window.location.origin).href); setMessage('Link je kopiran.') }
            catch { setMessage('Otvorite pregled i kopirajte adresu iz browsera.') }
          }}>Kopiraj link</Button>
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => change('DELETE')}>Opozovi link</Button>
        </>}
        <Button className="min-h-11" disabled={busy || isLoading || !!error} onClick={() => change('POST')}>
          {busy ? 'Obrada…' : data?.url ? 'Napravi novi link' : 'Uključi deljenje'}
        </Button>
      </div>
      <p role="status" className="mt-2 text-sm text-muted-foreground">{message || (error ? 'Deljenje trenutno nije dostupno.' : !isLoading && !data?.url ? 'Deljenje je isključeno.' : '')}</p>
    </section>
  )
}
