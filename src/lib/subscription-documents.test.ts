import { describe, expect, it } from 'vitest'
import { subscriptionInvoiceIds } from './subscription-documents'

describe('subscriptionInvoiceIds', () => {
  it('marks billing predračuni and the invoices converted from them, nothing else', () => {
    const ids = subscriptionInvoiceIds([
      { id: 'pr-sub', convertedInvoiceId: 'inv-sub', billingNotice: { id: 'n1' } },
      { id: 'inv-sub', convertedInvoiceId: null, billingNotice: null },
      { id: 'pr-setvi', convertedInvoiceId: 'inv-setvi', billingNotice: null },
      { id: 'inv-setvi', billingNotice: null },
    ])
    expect([...ids].sort()).toEqual(['inv-sub', 'pr-sub'])
  })
})
