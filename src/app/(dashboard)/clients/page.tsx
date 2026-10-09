'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FilePlus2, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { LoadErrorState } from '@/components/layout/LoadErrorState'
import { failedBeforeFirstLoad } from '@/lib/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { clientWriteSchema } from '@/lib/validations'
import { PIB_LENGTH, REGISTRATION_NUMBER_LENGTH, digitsOnly } from '@/lib/company-fields'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import { sr } from '@/lib/ui-copy'
import type { Client } from '@/types/client'

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clients')
  if (!response.ok) {
    throw new Error('Failed to fetch clients')
  }
  return response.json()
}

type FormState = { name: string; pib: string; registrationNumber: string; address: string }
type FieldErrors = Partial<Record<keyof FormState, string>>
const emptyForm: FormState = { name: '', pib: '', registrationNumber: '', address: '' }

/** Same rules as SEF (clientWriteSchema), one message per field. */
function validateClient(form: FormState): FieldErrors {
  const parsed = clientWriteSchema.safeParse(form)
  if (parsed.success) return {}
  const errors: FieldErrors = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof FormState
    errors[field] ??= issue.message
  }
  return errors
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null
}

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const { data: clients = [], isLoading, isError: loadFailed, dataUpdatedAt: loadedAt, refetch: reload, isFetching: reloading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setFieldErrors({})
    setSubmitted(false)
  }

  // After the first "Sačuvaj", errors follow the typing so the user sees when a field is fixed.
  const updateField = (field: keyof FormState, value: string) => {
    const next = { ...form, [field]: field === 'pib' || field === 'registrationNumber' ? digitsOnly(value) : value }
    setForm(next)
    if (submitted) setFieldErrors(validateClient(next))
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
    setForm({
      name: client.name,
      pib: client.pib ?? '',
      registrationNumber: client.registrationNumber ?? '',
      address: client.address ?? '',
    })
    setFieldErrors({})
    setSubmitted(false)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const errors = validateClient(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      notify.error('Kupac nije sačuvan', { description: 'Ispravite polja označena crvenom bojom.' })
      return
    }
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  Naziv kupca <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby="clientName-error"
                />
                <FieldError id="clientName-error" message={fieldErrors.name} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientPib">PIB</Label>
                  <Input
                    id="clientPib"
                    value={form.pib}
                    onChange={(e) => updateField('pib', e.target.value)}
                    placeholder="9 cifara"
                    inputMode="numeric"
                    maxLength={PIB_LENGTH}
                    aria-invalid={Boolean(fieldErrors.pib)}
                    aria-describedby="clientPib-error"
                  />
                  <FieldError id="clientPib-error" message={fieldErrors.pib} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientRegistrationNumber">Matični broj</Label>
                  <Input
                    id="clientRegistrationNumber"
                    value={form.registrationNumber}
                    onChange={(e) => updateField('registrationNumber', e.target.value)}
                    placeholder="8 cifara, za SEF"
                    inputMode="numeric"
                    maxLength={REGISTRATION_NUMBER_LENGTH}
                    aria-invalid={Boolean(fieldErrors.registrationNumber)}
                    aria-describedby="clientRegistrationNumber-error"
                  />
                  <FieldError id="clientRegistrationNumber-error" message={fieldErrors.registrationNumber} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clientAddress">Adresa</Label>
                  <Input
                    id="clientAddress"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder={sr.address.placeholder}
                    aria-invalid={Boolean(fieldErrors.address)}
                    aria-describedby="clientAddress-error"
                  />
                  <FieldError id="clientAddress-error" message={fieldErrors.address} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Za SEF kupac treba PIB, matični broj i adresu sa mestom. Kupac bez PIB-a (npr. fizičko lice) može da se sačuva samo sa nazivom.
              </p>
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
      ) : failedBeforeFirstLoad({ isError: loadFailed, dataUpdatedAt: loadedAt }) ? (
        <LoadErrorState onRetry={() => reload()} retrying={reloading} />
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
                    <p className="text-sm text-muted-foreground">
                      PIB: {client.pib}
                      {client.registrationNumber ? ` · MB: ${client.registrationNumber}` : ''}
                    </p>
                  ) : null}
                  {client.address ? (
                    <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {client.address}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-11 sm:h-9" asChild>
                    <Link href={`/invoices/new?clientId=${client.id}`} aria-label={`Nova faktura za ${client.name}`}>
                      <FilePlus2 className="mr-1.5 h-4 w-4" />
                      Faktura
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="h-11 sm:h-9" asChild>
                    <Link
                      href={`/invoices/new?type=proforma&clientId=${client.id}`}
                      aria-label={`Novi predračun za ${client.name}`}
                    >
                      Predračun
                    </Link>
                  </Button>
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
