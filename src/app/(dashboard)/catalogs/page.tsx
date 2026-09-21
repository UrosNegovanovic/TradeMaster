'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Trash2, Eye, Edit, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Catalog } from '@/types/catalog'
import { notify } from '@/lib/notify'
import { PageHeader } from '@/components/layout/PageHeader'

async function fetchCatalogs() {
  const response = await fetch('/api/catalogs')
  if (!response.ok) {
    throw new Error('Failed to fetch catalogs')
  }
  return response.json()
}

async function deleteCatalog(id: string) {
  const response = await fetch(`/api/catalogs/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete catalog')
  }

  return response.json()
}

export default function CatalogsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch catalogs
  const { data: catalogs, isLoading } = useQuery<Catalog[]>({
    queryKey: ['catalogs'],
    queryFn: fetchCatalogs,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCatalog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      notify.success('Catalog deleted', {
        description: 'The catalog has been removed from your records.',
      })
    },
    onError: (error: Error) => {
      notify.error('Failed to delete catalog', {
        description: error.message || 'Please try again.',
      })
    },
  })

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this catalog?')) {
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Još nema kataloga</h3>
            <p className="text-muted-foreground text-center mb-4">
              Napravite prvi katalog za klijenta.
            </p>
            <Link href="/catalogs/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novi katalog
              </Button>
            </Link>
          </CardContent>
        </Card>
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
                  <CardDescription>Client: {catalog.clientName}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {catalog.items?.length || 0} products
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
