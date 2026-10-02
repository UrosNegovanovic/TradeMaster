'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Eye, Edit, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Catalog } from '@/types/catalog'
import { notify } from '@/lib/notify'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { FirstRunEmptyState } from '@/components/onboarding/FirstRunEmptyState'
import { sr } from '@/lib/ui-copy'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'

async function fetchCatalogs() {
  const response = await fetch('/api/catalogs')
  if (!response.ok) {
    throw new Error('Katalozi nisu učitani')
  }
  return response.json()
}

async function deleteCatalog(id: string, request: SessionFetch) {
  const response = await request(`/api/catalogs/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || sr.catalog.deleteFailed)
  }

  return response.json()
}

export default function CatalogsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()

  // Fetch catalogs
  const { data: catalogs, isLoading } = useQuery<Catalog[]>({
    queryKey: ['catalogs'],
    queryFn: fetchCatalogs,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatalog(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      notify.success(sr.catalog.deleted, {
        description: sr.catalog.deletedDescription,
      })
    },
    onError: (error: Error) => {
      notify.error(sr.catalog.deleteFailed, {
        description: error.message || sr.catalog.tryAgain,
      })
    },
  })

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: sr.catalog.confirmDelete,
      confirmLabel: 'Obriši',
      cancelLabel: 'Otkaži',
      variant: 'destructive',
    })
    if (confirmed) {
      deleteMutation.mutate(id)
    }
  }

  const formatDiscount = (discount: number | string | { toString(): string }) => {
    const numDiscount = typeof discount === 'string' 
      ? parseFloat(discount) 
      : typeof discount === 'number'
      ? discount
      : Number(discount.toString())
    return `${numDiscount.toFixed(2)}%`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        className="mb-6"
        title="Katalozi"
        description="Katalog za klijenta, sa proizvodima i popustom"
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/catalogs/new">
              <Plus className="mr-2 h-4 w-4" />
              Novi katalog
            </Link>
          </Button>
        }
      />

      {!catalogs || catalogs.length === 0 ? (
        <FirstRunEmptyState kind="catalog" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {catalogs.map((catalog) => (
            <Card key={catalog.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{catalog.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatDiscount(catalog.discount)}
                  </span>
                </CardTitle>
                {catalog.clientName && (
                  <CardDescription>{sr.catalog.client}: {catalog.clientName}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {sr.catalog.productCount(catalog.items?.length || 0)}
                    </p>
                    {catalog.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {catalog.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" asChild>
                      <Link href={`/catalogs/${catalog.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Pregled
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" asChild>
                      <Link href={`/catalogs/${catalog.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Izmeni
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => handleDelete(catalog.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
