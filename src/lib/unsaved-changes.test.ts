import { describe, expect, it } from 'vitest'
import { internalNavigationTarget, invoiceDraftSnapshot, sameSelection } from './unsaved-changes'

const here = 'https://app.example/invoices/new?x=1'

describe('internalNavigationTarget', () => {
  it('returns the path for in-app links to another page', () => {
    expect(internalNavigationTarget({ href: 'https://app.example/invoices' }, here)).toBe('/invoices')
    expect(internalNavigationTarget({ href: 'https://app.example/invoices?status=paid' }, here)).toBe(
      '/invoices?status=paid'
    )
    expect(internalNavigationTarget({ href: '/catalogs' }, here)).toBe('/catalogs')
  })

  it('ignores links that do not leave the form', () => {
    expect(internalNavigationTarget({ href: 'https://other.example/x' }, here)).toBeNull()
    expect(internalNavigationTarget({ href: 'https://app.example/invoices/new?x=1' }, here)).toBeNull()
    expect(internalNavigationTarget({ href: 'https://app.example/invoices/new?x=1#top' }, here)).toBeNull()
    expect(internalNavigationTarget({ href: 'https://app.example/a', target: '_blank' }, here)).toBeNull()
    expect(internalNavigationTarget({ href: 'https://app.example/a.pdf', hasDownload: true }, here)).toBeNull()
    expect(internalNavigationTarget({ href: 'mailto:a@b.rs' }, here)).toBeNull()
    expect(internalNavigationTarget({ href: 'tel:+381' }, here)).toBeNull()
  })

  it('treats the same page with another query as navigation', () => {
    expect(internalNavigationTarget({ href: 'https://app.example/invoices/new?x=2' }, here)).toBe(
      '/invoices/new?x=2'
    )
  })
})

describe('invoiceDraftSnapshot', () => {
  const base = {
    invoiceNumber: '2026-001',
    dueDate: '2026-11-01',
    clientName: 'Kupac',
    clientAddress: '',
    clientPib: '',
    items: [{ productId: 'p1', productName: 'Roba', quantity: 2, unitPrice: 100, discount: 0, vatRate: 20 }],
  }

  it('is equal for the same content regardless of number/string types', () => {
    const same = { ...base, items: [{ ...base.items[0], quantity: '2', unitPrice: '100.00' }] }
    expect(invoiceDraftSnapshot(same)).toBe(invoiceDraftSnapshot(base))
  })

  it('changes when a field or a line changes', () => {
    expect(invoiceDraftSnapshot({ ...base, clientName: 'Drugi' })).not.toBe(invoiceDraftSnapshot(base))
    expect(invoiceDraftSnapshot({ ...base, items: [{ ...base.items[0], quantity: 3 }] })).not.toBe(
      invoiceDraftSnapshot(base)
    )
    expect(invoiceDraftSnapshot({ ...base, items: [...base.items, {}] })).not.toBe(invoiceDraftSnapshot(base))
  })
})

describe('sameSelection', () => {
  it('is order sensitive because the order is the manual catalog order', () => {
    expect(sameSelection(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameSelection(['b', 'a'], ['a', 'b'])).toBe(false)
    expect(sameSelection(['a'], ['a', 'b'])).toBe(false)
  })
})
