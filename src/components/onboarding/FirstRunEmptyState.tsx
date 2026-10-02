'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { FileText, Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { emptyStateAction, hasCompanyDetails } from '@/lib/onboarding'
import { sr } from '@/lib/ui-copy'

async function fetchProducts(): Promise<unknown[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Proizvodi nisu učitani')
  }
  return response.json()
}

async function fetchProfile(): Promise<{ companyName?: string | null; pib?: string | null }> {
  const response = await fetch('/api/profile')
  if (!response.ok) {
    throw new Error('Profil nije učitan')
  }
  return response.json()
}

type Kind = 'catalog' | 'invoice'

/**
 * Empty state for Katalozi and Fakture. Both are built from products, so with an
 * empty assortment the next step is adding a product; for invoices it also nudges
 * the user to fill in company data that is printed on the PDF.
 */
export function FirstRunEmptyState({ kind }: { kind: Kind }) {
  const copy = sr.onboarding.empty[kind]
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: kind === 'invoice',
  })

  // Until products load, keep the regular "create" call to action instead of flashing a different one.
  const action = isLoading || !products ? 'create' : emptyStateAction(products.length)
  const missingCompany = kind === 'invoice' && profile !== undefined && !hasCompanyDetails(profile)

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {action === 'add-product' ? (
          <>
            <Package className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
            <h3 className="mb-2 text-lg font-semibold">{copy.title}</h3>
            <p className="mb-4 max-w-md text-muted-foreground">{copy.needProducts}</p>
            <Button asChild>
              <Link href="/inventory">
                <Plus className="mr-2 h-4 w-4" />
                {sr.onboarding.addProduct}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
            <h3 className="mb-2 text-lg font-semibold">{copy.title}</h3>
            <p className="mb-4 max-w-md text-muted-foreground">{copy.ready}</p>
            <Button asChild>
              <Link href={copy.createHref}>
                <Plus className="mr-2 h-4 w-4" />
                {copy.createLabel}
              </Link>
            </Button>
          </>
        )}
        {missingCompany ? (
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {sr.onboarding.companyMissing}{' '}
            <Link href="/settings" className="font-medium text-primary underline">
              {sr.onboarding.openSettings}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
