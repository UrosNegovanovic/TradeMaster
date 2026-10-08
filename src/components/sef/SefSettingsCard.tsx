'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'

type SefKeyState = { available: boolean; configured: boolean; environment: 'demo' | 'production' | null }

export const SEF_KEY_QUERY = ['sef-key'] as const

/**
 * Podešavanja → Slanje u SEF (ROADMAP A3). The key is typed once and never shown again:
 * only "Ključ je unet", "Proveri vezu" and "Obriši ključ".
 */
export function SefSettingsCard() {
  const request = useAuthorizedFetch()
  const queryClient = useQueryClient()
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState<'save' | 'check' | 'delete' | null>(null)
  const [checkMessage, setCheckMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const { data } = useQuery<SefKeyState>({
    queryKey: SEF_KEY_QUERY,
    queryFn: async () => {
      const response = await fetch('/api/profile/sef-key', { cache: 'no-store' })
      if (!response.ok) throw new Error('SEF nije dostupan')
      return response.json()
    },
  })

  if (!data?.available) return null

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy('save')
    setCheckMessage(null)
    try {
      const response = await request('/api/profile/sef-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Ključ nije sačuvan.'))
      setApiKey('')
      queryClient.setQueryData(SEF_KEY_QUERY, await response.json())
      notify.success('SEF API ključ je sačuvan')
    } catch (error) {
      notify.error('Ključ nije sačuvan', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  async function check() {
    setBusy('check')
    try {
      const response = await request('/api/profile/sef-key/check', { method: 'POST' })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null
      setCheckMessage({ ok: body?.ok === true, text: body?.message ?? 'Provera nije uspela.' })
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!window.confirm('Obrisati SEF API ključ? Fakture se više neće slati u SEF dok ne unesete novi.')) return
    setBusy('delete')
    try {
      const response = await request('/api/profile/sef-key', { method: 'DELETE' })
      if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Ključ nije obrisan.'))
      setCheckMessage(null)
      queryClient.setQueryData(SEF_KEY_QUERY, await response.json())
    } catch (error) {
      notify.error('Ključ nije obrisan', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Slanje u SEF</CardTitle>
        <CardDescription>
          Unesite API ključ koji ste napravili na SEF portalu i fakture šaljete u SEF jednim dodirom.
          Bez ključa sve radi kao do sada.
          {data.environment === 'demo' ? ' Trenutno je povezan SEF demo, ne pravi SEF.' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.configured ? (
          <>
            <p className="text-sm font-medium">Ključ je unet.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="min-h-11" onClick={check} disabled={busy !== null}>
                {busy === 'check' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Proveri vezu
              </Button>
              <Button type="button" variant="ghost" className="min-h-11" onClick={remove} disabled={busy !== null}>
                Obriši ključ
              </Button>
            </div>
            {checkMessage ? (
              <p role="status" className={checkMessage.ok ? 'text-sm text-emerald-700' : 'text-sm text-destructive'}>
                {checkMessage.text}
              </p>
            ) : null}
          </>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sefApiKey">SEF API ključ</Label>
              <Input
                id="sefApiKey"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Nalepite ključ sa SEF portala"
              />
              <p className="text-xs text-muted-foreground">Ključ čuvamo šifrovan i više ga ne prikazujemo.</p>
            </div>
            <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={busy !== null || apiKey.trim().length < 10}>
              {busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sačuvaj ključ
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
