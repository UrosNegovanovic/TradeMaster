import { describe, expect, it } from 'vitest'
import {
  emptyStateAction,
  getOnboardingProgress,
  hasCompanyDetails,
} from './onboarding'

const empty = { companyName: null, pib: null, productCount: 0, invoiceCount: 0 }

describe('hasCompanyDetails', () => {
  it('needs both a name and a 9-digit PIB', () => {
    expect(hasCompanyDetails(null)).toBe(false)
    expect(hasCompanyDetails({ companyName: 'Firma', pib: null })).toBe(false)
    expect(hasCompanyDetails({ companyName: '  ', pib: '123456789' })).toBe(false)
    expect(hasCompanyDetails({ companyName: 'Firma', pib: '12345' })).toBe(false)
    expect(hasCompanyDetails({ companyName: 'Firma', pib: ' 123456789 ' })).toBe(true)
  })
})

describe('getOnboardingProgress', () => {
  it('starts with the company step for a brand new profile', () => {
    const progress = getOnboardingProgress(empty)
    expect(progress.doneCount).toBe(0)
    expect(progress.total).toBe(3)
    expect(progress.complete).toBe(false)
    expect(progress.next?.id).toBe('company')
    expect(progress.steps.map((step) => step.id)).toEqual(['company', 'product', 'invoice'])
  })

  it('derives each step from data and points to the first missing one', () => {
    const progress = getOnboardingProgress({ ...empty, productCount: 4 })
    expect(progress.steps.find((s) => s.id === 'product')?.done).toBe(true)
    expect(progress.next?.id).toBe('company')

    const afterCompany = getOnboardingProgress({
      companyName: 'Firma',
      pib: '123456789',
      productCount: 4,
      invoiceCount: 0,
    })
    expect(afterCompany.doneCount).toBe(2)
    expect(afterCompany.next?.id).toBe('invoice')
    expect(afterCompany.next?.href).toBe('/invoices/new')
  })

  it('is complete once company, product and invoice exist', () => {
    const progress = getOnboardingProgress({
      companyName: 'Firma',
      pib: '123456789',
      productCount: 1,
      invoiceCount: 1,
    })
    expect(progress.complete).toBe(true)
    expect(progress.next).toBeNull()
  })
})

describe('emptyStateAction', () => {
  it('sends the user to the assortment when there are no products', () => {
    expect(emptyStateAction(0)).toBe('add-product')
    expect(emptyStateAction(2)).toBe('create')
  })
})
