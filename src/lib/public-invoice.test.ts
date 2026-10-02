import { describe, expect, it } from 'vitest'
import { getSafeInvoiceSharePath, invoiceSharePath, isShareToken, isShareableInvoiceStatus, publicInvoiceSelect } from './public-invoice'

const token = 'b'.repeat(64)

describe('public invoice contract', () => {
  it('shares issued invoices only', () => {
    expect(isShareableInvoiceStatus('UNPAID')).toBe(true)
    expect(isShareableInvoiceStatus('PAID')).toBe(true)
    expect(isShareableInvoiceStatus('DRAFT')).toBe(false)
  })

  it('accepts only 64-hex tokens and matching paths', () => {
    expect(isShareToken(token)).toBe(true)
    expect(isShareToken('cuid-invoice-id')).toBe(false)
    expect(getSafeInvoiceSharePath(invoiceSharePath(token))).toBe(`/shared/invoice/${token}`)
    expect(getSafeInvoiceSharePath('https://evil.example/shared/invoice/' + token)).toBeNull()
    expect(getSafeInvoiceSharePath(`/shared/catalog/${token}`)).toBeNull()
  })

  it('never selects cost, owner ids or the token', () => {
    const top = Object.keys(publicInvoiceSelect)
    for (const key of ['id', 'profileId', 'shareToken', 'shareEnabled', 'paidAt']) expect(top).not.toContain(key)
    expect(Object.keys(publicInvoiceSelect.items.select)).not.toContain('unitCost')
    expect(Object.keys(publicInvoiceSelect.items.select)).not.toContain('productId')
    expect(Object.keys(publicInvoiceSelect.profile.select)).not.toContain('id')
    expect(Object.keys(publicInvoiceSelect.profile.select)).not.toContain('clerkUserId')
  })
})
