/**
 * First-run onboarding derived from existing tenant data (no extra table).
 * A step is done when the data it asks for exists, so the checklist never
 * drifts from reality and disappears on its own once everything is in place.
 */

export type OnboardingStepId = 'company' | 'product' | 'invoice'

export interface OnboardingInput {
  companyName?: string | null
  pib?: string | null
  productCount: number
  invoiceCount: number
}

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  description: string
  href: string
  actionLabel: string
  done: boolean
}

export interface OnboardingProgress {
  steps: OnboardingStep[]
  doneCount: number
  total: number
  complete: boolean
  next: OnboardingStep | null
}

const PIB_PATTERN = /^\d{9}$/

/** Company is ready for invoices once it has a name and a valid 9-digit PIB. */
export function hasCompanyDetails(profile: { companyName?: string | null; pib?: string | null } | null | undefined): boolean {
  if (!profile) return false
  const name = profile.companyName?.trim() ?? ''
  const pib = profile.pib?.trim() ?? ''
  return name.length > 0 && PIB_PATTERN.test(pib)
}

export function getOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
  return [
    {
      id: 'company',
      title: 'Podaci firme',
      description: 'Naziv i PIB se štampaju na fakturi i katalogu.',
      href: '/settings',
      actionLabel: 'Popuni podatke',
      done: hasCompanyDetails(input),
    },
    {
      id: 'product',
      title: 'Prvi proizvod',
      description: 'Skenirajte barkod ili dodajte proizvod ručno, sa nabavnom cenom.',
      href: '/inventory',
      actionLabel: 'Dodaj proizvod',
      done: input.productCount > 0,
    },
    {
      id: 'invoice',
      title: 'Prva faktura',
      description: 'Izaberite proizvode iz asortimana i izdajte fakturu kupcu.',
      href: '/invoices/new',
      actionLabel: 'Napravi fakturu',
      done: input.invoiceCount > 0,
    },
  ]
}

export function getOnboardingProgress(input: OnboardingInput): OnboardingProgress {
  const steps = getOnboardingSteps(input)
  const doneCount = steps.filter((step) => step.done).length
  return {
    steps,
    doneCount,
    total: steps.length,
    complete: doneCount === steps.length,
    next: steps.find((step) => !step.done) ?? null,
  }
}

export type EmptyStateAction = 'add-product' | 'create'

/**
 * Catalogs and invoices are built from products, so with an empty assortment
 * the next step on those pages is adding a product, not creating the document.
 */
export function emptyStateAction(productCount: number): EmptyStateAction {
  return productCount > 0 ? 'create' : 'add-product'
}
