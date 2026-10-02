'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { clientWriteSchema } from '@/lib/validations'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { Client } from '@/types/client'

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clients')
  if (!response.ok) {
    throw new Error('Failed to fetch clients')
  }
  return response.json()
}

type FormState = { name: string; pib: string; address: string }
const emptyForm: FormState = { name: '', pib: '', address: '' }

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const response = await request(editingId ? `/api/clients/${editingId}` : '/api/clients', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Kupac nije sačuvan'))
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      notify.success(editingId ? 'Kupac je izmenjen' : 'Kupac je dodat')
      closeForm()
    },
    onError: (error: Error) => {
      notify.error('Kupac nije sačuvan', { description: error.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await request(`/api/clients/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Kupac nije obrisan'))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      notify.success('Kupac je obrisan', {
        description: 'Postojeće fakture ostaju nepromenjene.',
      })
    },
    onError: (error: Error) => {
      notify.error('Kupac nije obrisan', { description: error.message })
    },
  })

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setForm({ name: client.name, pib: client.pib ?? '', address: client.address ?? '' })
    setFormError(null)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = clientWriteSchema.safeParse(form)
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message ?? 'Proverite unete podatke')
      return
    }
    setFormError(null)
    saveMutation.mutate(form)
  }

  const handleDelete = async (client: Client) => {
    const confirmed = await confirmDialog({
      title: `Obrisati kupca "${client.name}"?`,
      description: 'Postojeće fakture ostaju nepromenjene.',
      confirmLabel: 'Obriši',
      variant: 'destructive',
    })
    if (confirmed) deleteMutation.mutate(client.id)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Kupci"
        description="Sačuvajte kupce jednom i birajte ih na fakturi."
        action={
          <Button className="min-h-11" onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj kupca
          </Button>
        }
      />

      {showForm ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  Naziv kupca <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientPib">PIB</Label>
                  <Input
                    id="clientPib"
                    value={form.pib}
                    onChange={(e) => setForm({ ...form, pib: e.target.value })}
                    placeholder="9 cifara"
                    inputMode="numeric"
                    maxLength={9}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Adresa</Label>
                  <Input
                    id="clientAddress"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Opciono"
                  />
                </div>
              </div>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="min-h-11" onClick={closeForm}>
                  Otkaži
                </Button>
                <Button type="submit" className="min-h-11" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Čuvanje...
                    </>
                  ) : (
                    'Sačuvaj'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Još nema sačuvanih kupaca</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Dodajte kupca da ne biste svaki put ponovo kucali naziv, PIB i adresu na fakturi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="break-words font-medium [overflow-wrap:anywhere]">{client.name}</p>
                  {client.pib ? (
                    <p className="text-sm text-muted-foreground">PIB: {client.pib}</p>
                  ) : null}
                  {client.address ? (
                    <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {client.address}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 w-11 p-0 sm:h-9 sm:w-9"
                    onClick={() => startEdit(client)}
                    aria-label={`Izmeni kupca ${client.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 w-11 p-0 sm:h-9 sm:w-9"
                    onClick={() => handleDelete(client)}
                    aria-label={`Obriši kupca ${client.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
