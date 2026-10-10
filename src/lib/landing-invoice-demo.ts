import { buildIpsQrPayload } from '@/lib/ips-qr'

/** Fictional invoice for the landing page. No real company, PIB or account. */
export const DEMO_INVOICE = {
  number: '14/2026',
  company: 'Demo Trgovina d.o.o.',
  customer: 'Market Primer d.o.o.',
  giroAccount: '160-0000000000001-73',
  lines: [
    { name: 'Kafa 1 kg', quantity: 10, unitPrice: 1250, vatRate: 20 },
    { name: 'Sok 1 l', quantity: 24, unitPrice: 120, vatRate: 20 },
    { name: 'Testenina 500 g', quantity: 30, unitPrice: 95, vatRate: 10 },
    { name: 'Voda 1,5 l', quantity: 48, unitPrice: 60, vatRate: 10 },
  ],
} as const

export function demoInvoiceTotals() {
  const base: Record<number, number> = { 10: 0, 20: 0 }
  for (const line of DEMO_INVOICE.lines) {
    base[line.vatRate] += Math.round(line.quantity * line.unitPrice * 100)
  }
  const vat10 = Math.round(base[10] * 0.1)
  const vat20 = Math.round(base[20] * 0.2)
  const osnovica = base[10] + base[20]
  return {
    base10: base[10] / 100,
    base20: base[20] / 100,
    vat10: vat10 / 100,
    vat20: vat20 / 100,
    osnovica: osnovica / 100,
    total: (osnovica + vat10 + vat20) / 100,
  }
}

export function demoInvoiceQrPayload(): string | null {
  return buildIpsQrPayload({
    giroAccount: DEMO_INVOICE.giroAccount,
    companyName: DEMO_INVOICE.company,
    amount: demoInvoiceTotals().total,
    invoiceNumber: DEMO_INVOICE.number,
  })
}
