import { describe, expect, it } from 'vitest'
import { buildSefInvoiceXml, splitSerbianAddress, type SefInvoiceInput } from './sef-ubl'

function accountWithControl(bank: string, account13: string): string {
  const base = `${bank}${account13}`
  let remainder = 0
  for (const digit of `${base}00`) remainder = (remainder * 10 + Number(digit)) % 97
  return `${base}${String(98 - remainder).padStart(2, '0')}`
}

const account = accountWithControl('160', '0000000123456')

const input: SefInvoiceInput = {
  invoiceNumber: '05/2026',
  issueDate: '2026-10-05T10:00:00.000Z',
  dueDate: '2026-10-20T10:00:00.000Z',
  vatEnabled: true,
  seller: {
    name: 'Demo Trgovina d.o.o.',
    pib: '123456788',
    registrationNumber: '12345678',
    address: 'Bulevar oslobođenja 12, 21000 Novi Sad',
    email: 'demo@example.com',
    giroAccount: `${account.slice(0, 3)}-${account.slice(3, 16)}-${account.slice(16)}`,
  },
  buyer: {
    name: 'Market & Sinovi d.o.o.',
    pib: '987654328',
    registrationNumber: '87654321',
    address: 'Kneza Miloša 1, Beograd',
  },
  items: [
    { productName: 'Kafa 1 kg', quantity: 10, unitPrice: '1250', discount: '0', vatRate: '20', total: '12500' },
    { productName: 'Testenina <500 g>', quantity: 30, unitPrice: '100', discount: '5', vatRate: '10', total: '2850' },
  ],
}

function tag(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`, 'g'))].map((match) => match[1])
}

describe('splitSerbianAddress', () => {
  it('splits street, postal code and city', () => {
    expect(splitSerbianAddress('Bulevar 12, 21000 Novi Sad')).toEqual({
      street: 'Bulevar 12',
      city: 'Novi Sad',
      postalZone: '21000',
    })
  })

  it('uses the whole text for both when there is no comma', () => {
    expect(splitSerbianAddress('Beograd')).toEqual({ street: 'Beograd', city: 'Beograd', postalZone: null })
  })
})

describe('buildSefInvoiceXml', () => {
  it('builds a PDV invoice with per-rate totals that match the invoice', () => {
    const result = buildSefInvoiceXml(input)
    if (!result.ok) throw new Error(result.problems.join(' '))
    const { xml } = result

    expect(xml).toContain('urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022')
    expect(tag(xml, 'cbc:ID')[0]).toBe('05/2026')
    expect(tag(xml, 'cbc:IssueDate')).toEqual(['2026-10-05'])
    expect(tag(xml, 'cbc:DueDate')).toEqual(['2026-10-20'])
    expect(tag(xml, 'cbc:EndpointID')).toEqual(['123456788', '987654328'])
    expect(xml).toContain('<cbc:CompanyID>RS123456788</cbc:CompanyID>')
    expect(xml).toContain('<cbc:CompanyID>87654321</cbc:CompanyID>')
    expect(xml).toContain(`<cbc:ID>${account}</cbc:ID>`)

    // 12500 * 20% = 2500, 2850 * 10% = 285
    expect(tag(xml, 'cbc:TaxableAmount')).toEqual(['12500.00', '2850.00'])
    expect(tag(xml, 'cbc:TaxAmount')).toEqual(['2785.00', '2500.00', '285.00'])
    expect(tag(xml, 'cbc:PayableAmount')).toEqual(['18135.00'])
    expect(tag(xml, 'cbc:LineExtensionAmount')).toEqual(['15350.00', '12500.00', '2850.00'])
  })

  it('shows the line discount as an allowance so price x quantity - discount = line amount', () => {
    const result = buildSefInvoiceXml(input)
    if (!result.ok) throw new Error('expected xml')
    expect(tag(result.xml, 'cbc:BaseAmount')).toEqual(['3000.00'])
    expect(tag(result.xml, 'cbc:Amount')).toEqual(['150.00'])
    expect(tag(result.xml, 'cbc:MultiplierFactorNumeric')).toEqual(['5.00'])
  })

  it('escapes XML special characters in names', () => {
    const result = buildSefInvoiceXml(input)
    if (!result.ok) throw new Error('expected xml')
    expect(result.xml).toContain('Market &amp; Sinovi d.o.o.')
    expect(result.xml).toContain('Testenina &lt;500 g&gt;')
    expect(result.xml).not.toContain('Testenina <500')
  })

  it('marks a company outside the PDV system with SS and PDV-RS-33', () => {
    const result = buildSefInvoiceXml({
      ...input,
      vatEnabled: false,
      items: input.items.map((item) => ({ ...item, vatRate: '0' })),
    })
    if (!result.ok) throw new Error(result.problems.join(' '))
    expect(tag(result.xml, 'cbc:TaxExemptionReasonCode')).toEqual(['PDV-RS-33'])
    expect(result.xml).not.toContain('<cbc:ID>S</cbc:ID>')
    expect(tag(result.xml, 'cbc:TaxAmount')).toEqual(['0.00', '0.00'])
    expect(tag(result.xml, 'cbc:PayableAmount')).toEqual(['15350.00'])
  })

  it('lists what is missing instead of producing an invalid file', () => {
    const result = buildSefInvoiceXml({
      ...input,
      seller: { ...input.seller, registrationNumber: null, giroAccount: '123' },
      buyer: { ...input.buyer, pib: null, registrationNumber: '' },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toEqual([
      'Matični broj firme mora imati 8 cifara.',
      'PIB kupca mora imati 9 cifara.',
      'Matični broj kupca mora imati 8 cifara.',
      'Žiro-račun firme nije ispravan.',
    ])
  })

  it('refuses a PIB whose control digit is wrong, because SEF refuses it', () => {
    const result = buildSefInvoiceXml({
      ...input,
      seller: { ...input.seller, pib: '123124129' },
      buyer: { ...input.buyer, pib: '123456777' },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toEqual([
      'PIB firme nije ispravan (kontrolna cifra ne odgovara).',
      'PIB kupca nije ispravan (kontrolna cifra ne odgovara).',
    ])
  })

  it('asks for the city when an address has none, instead of repeating the street as the city', () => {
    const result = buildSefInvoiceXml({
      ...input,
      seller: { ...input.seller, address: 'Kralja Petra I' },
      buyer: { ...input.buyer, address: 'Zarka Koraca I' },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toEqual([
      'Adresi firme nedostaje mesto. Unesite je kao "Ulica i broj, 11000 Beograd".',
      'Adresi kupca nedostaje mesto. Unesite je kao "Ulica i broj, 11000 Beograd".',
    ])
  })

  it('refuses 0% lines on a PDV invoice because the exemption reason is unknown', () => {
    const result = buildSefInvoiceXml({
      ...input,
      items: [{ ...input.items[0], vatRate: '0' }],
    })
    expect(result.ok).toBe(false)
  })
})
