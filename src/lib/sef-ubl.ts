import { Decimal } from '@prisma/client/runtime/library'
import { calculateVatBreakdown, isVatRate, roundMoneyHalfUp } from '@/lib/invoice-totals'
import { normalizeGiroAccount } from '@/lib/giro-account'
import { formatLocalYmd } from '@/lib/local-date'
import { isValidPib } from '@/lib/pib'

/**
 * UBL 2.1 invoice in the Serbian SEF profile (EN 16931 + srbdt:2022), for the owner to upload on
 * the SEF portal (Izlazni dokumenti -> Učitaj datoteku). TradeMaster does not send it to SEF itself.
 *
 * Scope on purpose:
 * - Company in the PDV system: lines at 20% or 10% (category S). A 0% line needs an exemption
 *   reason that TradeMaster does not record, so it is refused instead of guessed.
 * - Company outside the PDV system: every line is category SS with reason PDV-RS-33
 *   ("obveznik nije u sistemu PDV-a", član 33 ZPDV).
 * - Domestic buyer with PIB and matični broj; amounts in RSD; quantities in pieces (H87).
 */

export const SEF_CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022'
export const SEF_NON_VAT_CATEGORY = 'SS'
export const SEF_NON_VAT_REASON_CODE = 'PDV-RS-33'

type Amount = number | string | { toString(): string }

export type SefParty = {
  name: string | null | undefined
  pib: string | null | undefined
  registrationNumber: string | null | undefined
  address: string | null | undefined
  email?: string | null
}

export type SefInvoiceInput = {
  invoiceNumber: string
  issueDate: Date | string
  dueDate: Date | string
  vatEnabled: boolean
  seller: SefParty & { giroAccount: string | null | undefined }
  buyer: SefParty
  items: Array<{
    productName: string
    quantity: number
    unitPrice: Amount
    discount: Amount | null
    vatRate: Amount | null
    total: Amount
  }>
}

export type SefXmlResult = { ok: true; xml: string } | { ok: false; problems: string[] }

function text(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function money(value: Decimal): string {
  return roundMoneyHalfUp(value).toFixed(2)
}

function dec(value: Amount | null | undefined): Decimal {
  return new Decimal(value == null ? 0 : value.toString())
}

/**
 * "Bulevar 12, 11000 Beograd" -> street "Bulevar 12", city "Beograd" (postal code split off).
 * One-part addresses use the same text for both, because SEF requires a city.
 */
export function splitSerbianAddress(address: string | null | undefined): {
  street: string
  city: string
  postalZone: string | null
} {
  const parts = text(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return { street: '', city: '', postalZone: null }
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  const postal = /^(\d{5})\s+(.+)$/.exec(last)
  const city = postal ? postal[2] : last
  const street = parts.length > 1 ? parts.slice(0, -1).join(', ') : parts[0]
  return { street, city, postalZone: postal ? postal[1] : null }
}

function partyProblems(party: SefParty, who: 'firme' | 'kupca'): string[] {
  const problems: string[] = []
  if (!text(party.name)) problems.push(`Naziv ${who} je obavezan.`)
  const pib = text(party.pib)
  if (!/^\d{9}$/.test(pib)) problems.push(`PIB ${who} mora imati 9 cifara.`)
  else if (!isValidPib(pib)) problems.push(`PIB ${who} nije ispravan (kontrolna cifra ne odgovara).`)
  if (!/^\d{8}$/.test(text(party.registrationNumber))) problems.push(`Matični broj ${who} mora imati 8 cifara.`)
  if (!text(party.address)) problems.push(`Adresa ${who} je obavezna (ulica i mesto).`)
  else if (!text(party.address).includes(','))
    problems.push(`Adresi ${who} nedostaje mesto. Unesite je kao "Ulica i broj, 11000 Beograd".`)
  return problems
}

export function sefInvoiceProblems(input: SefInvoiceInput): string[] {
  const problems = [...partyProblems(input.seller, 'firme'), ...partyProblems(input.buyer, 'kupca')]
  if (!normalizeGiroAccount(input.seller.giroAccount)) {
    problems.push('Žiro-račun firme nije ispravan.')
  }
  if (input.items.length === 0) problems.push('Faktura nema stavki.')
  if (input.vatEnabled) {
    const zeroRated = input.items.filter((item) => Number(dec(item.vatRate)) === 0)
    if (zeroRated.length > 0) {
      problems.push(
        'Stavke sa PDV 0% traže razlog oslobođenja koji TradeMaster ne beleži. Takvu fakturu unesite direktno na SEF-u.'
      )
    }
  }
  return problems
}

function taxCategoryXml(indent: string, rate: number, vatEnabled: boolean, withReason: boolean): string {
  const lines = vatEnabled
    ? [`<cbc:ID>S</cbc:ID>`, `<cbc:Percent>${rate}</cbc:Percent>`]
    : [
        `<cbc:ID>${SEF_NON_VAT_CATEGORY}</cbc:ID>`,
        `<cbc:Percent>0</cbc:Percent>`,
        ...(withReason
          ? [
              `<cbc:TaxExemptionReasonCode>${SEF_NON_VAT_REASON_CODE}</cbc:TaxExemptionReasonCode>`,
            ]
          : []),
      ]
  lines.push('<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>')
  return lines.map((line) => `${indent}${line}`).join('\n')
}

function partyXml(tag: 'AccountingSupplierParty' | 'AccountingCustomerParty', party: SefParty): string {
  const name = escapeXml(text(party.name))
  const pib = text(party.pib)
  const address = splitSerbianAddress(party.address)
  const email = text(party.email)
  return [
    `  <cac:${tag}>`,
    '    <cac:Party>',
    `      <cbc:EndpointID schemeID="9948">${pib}</cbc:EndpointID>`,
    `      <cac:PartyName><cbc:Name>${name}</cbc:Name></cac:PartyName>`,
    '      <cac:PostalAddress>',
    `        <cbc:StreetName>${escapeXml(address.street)}</cbc:StreetName>`,
    `        <cbc:CityName>${escapeXml(address.city)}</cbc:CityName>`,
    ...(address.postalZone ? [`        <cbc:PostalZone>${address.postalZone}</cbc:PostalZone>`] : []),
    '        <cac:Country><cbc:IdentificationCode>RS</cbc:IdentificationCode></cac:Country>',
    '      </cac:PostalAddress>',
    '      <cac:PartyTaxScheme>',
    `        <cbc:CompanyID>RS${pib}</cbc:CompanyID>`,
    '        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>',
    '      </cac:PartyTaxScheme>',
    '      <cac:PartyLegalEntity>',
    `        <cbc:RegistrationName>${name}</cbc:RegistrationName>`,
    `        <cbc:CompanyID>${text(party.registrationNumber)}</cbc:CompanyID>`,
    '      </cac:PartyLegalEntity>',
    ...(email ? [`      <cac:Contact><cbc:ElectronicMail>${escapeXml(email)}</cbc:ElectronicMail></cac:Contact>`] : []),
    '    </cac:Party>',
    `  </cac:${tag}>`,
  ].join('\n')
}

/**
 * Builds the XML, or lists in Serbian what has to be filled in first. Amounts are recomputed from
 * the stored lines with the same rounding as the invoice (PDV per rate on the summed base).
 */
export function buildSefInvoiceXml(input: SefInvoiceInput): SefXmlResult {
  const problems = sefInvoiceProblems(input)
  if (problems.length > 0) return { ok: false, problems }

  const vatEnabled = input.vatEnabled
  const lines = input.items.map((item, index) => {
    const quantity = new Decimal(item.quantity)
    const unitPrice = dec(item.unitPrice)
    const total = dec(item.total)
    const gross = roundMoneyHalfUp(quantity.times(unitPrice))
    const rawRate = Number(dec(item.vatRate))
    const rate = vatEnabled && isVatRate(rawRate) ? rawRate : 0
    return { index: index + 1, item, quantity, unitPrice, total, gross, allowance: gross.minus(total), rate }
  })
  const breakdown = calculateVatBreakdown(lines.map((line) => ({ total: line.total, vatRate: line.rate })))
  const account = normalizeGiroAccount(input.seller.giroAccount)!
  const issueDate = formatLocalYmd(new Date(input.issueDate))
  const dueDate = formatLocalYmd(new Date(input.dueDate))

  const taxSubtotals = breakdown.groups
    .map((group) =>
      [
        '    <cac:TaxSubtotal>',
        `      <cbc:TaxableAmount currencyID="RSD">${money(group.base)}</cbc:TaxableAmount>`,
        `      <cbc:TaxAmount currencyID="RSD">${money(group.vat)}</cbc:TaxAmount>`,
        '      <cac:TaxCategory>',
        taxCategoryXml('        ', group.rate, vatEnabled, true),
        '      </cac:TaxCategory>',
        '    </cac:TaxSubtotal>',
      ].join('\n')
    )
    .join('\n')

  const invoiceLines = lines
    .map((line) => {
      const discountPercent = dec(line.item.discount)
      const allowance = line.allowance.gt(0)
        ? [
            '    <cac:AllowanceCharge>',
            '      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>',
            // UNTDID 5189 code 95 = Discount (EN 16931 BR-42: a line allowance needs a reason).
            '      <cbc:AllowanceChargeReasonCode>95</cbc:AllowanceChargeReasonCode>',
            `      <cbc:MultiplierFactorNumeric>${discountPercent.toFixed(2)}</cbc:MultiplierFactorNumeric>`,
            `      <cbc:Amount currencyID="RSD">${money(line.allowance)}</cbc:Amount>`,
            `      <cbc:BaseAmount currencyID="RSD">${money(line.gross)}</cbc:BaseAmount>`,
            '    </cac:AllowanceCharge>',
          ]
        : []
      return [
        '  <cac:InvoiceLine>',
        `    <cbc:ID>${line.index}</cbc:ID>`,
        `    <cbc:InvoicedQuantity unitCode="H87">${line.quantity.toString()}</cbc:InvoicedQuantity>`,
        `    <cbc:LineExtensionAmount currencyID="RSD">${money(line.total)}</cbc:LineExtensionAmount>`,
        ...allowance,
        '    <cac:Item>',
        `      <cbc:Name>${escapeXml(text(line.item.productName))}</cbc:Name>`,
        '      <cac:ClassifiedTaxCategory>',
        taxCategoryXml('        ', line.rate, vatEnabled, false),
        '      </cac:ClassifiedTaxCategory>',
        '    </cac:Item>',
        `    <cac:Price><cbc:PriceAmount currencyID="RSD">${line.unitPrice.toFixed(2)}</cbc:PriceAmount></cac:Price>`,
        '  </cac:InvoiceLine>',
      ].join('\n')
    })
    .join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
    '         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    '         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',
    `  <cbc:CustomizationID>${SEF_CUSTOMIZATION_ID}</cbc:CustomizationID>`,
    `  <cbc:ID>${escapeXml(text(input.invoiceNumber))}</cbc:ID>`,
    `  <cbc:IssueDate>${issueDate}</cbc:IssueDate>`,
    `  <cbc:DueDate>${dueDate}</cbc:DueDate>`,
    '  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>',
    '  <cbc:DocumentCurrencyCode>RSD</cbc:DocumentCurrencyCode>',
    // 35 = PDV obligation arises on the date of supply (datum prometa), given in Delivery below.
    '  <cac:InvoicePeriod><cbc:DescriptionCode>35</cbc:DescriptionCode></cac:InvoicePeriod>',
    partyXml('AccountingSupplierParty', input.seller),
    partyXml('AccountingCustomerParty', input.buyer),
    `  <cac:Delivery><cbc:ActualDeliveryDate>${issueDate}</cbc:ActualDeliveryDate></cac:Delivery>`,
    '  <cac:PaymentMeans>',
    '    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>',
    `    <cac:PayeeFinancialAccount><cbc:ID>${account}</cbc:ID></cac:PayeeFinancialAccount>`,
    '  </cac:PaymentMeans>',
    '  <cac:TaxTotal>',
    `    <cbc:TaxAmount currencyID="RSD">${money(breakdown.vat)}</cbc:TaxAmount>`,
    taxSubtotals,
    '  </cac:TaxTotal>',
    '  <cac:LegalMonetaryTotal>',
    `    <cbc:LineExtensionAmount currencyID="RSD">${money(breakdown.base)}</cbc:LineExtensionAmount>`,
    `    <cbc:TaxExclusiveAmount currencyID="RSD">${money(breakdown.base)}</cbc:TaxExclusiveAmount>`,
    `    <cbc:TaxInclusiveAmount currencyID="RSD">${money(breakdown.total)}</cbc:TaxInclusiveAmount>`,
    '    <cbc:AllowanceTotalAmount currencyID="RSD">0.00</cbc:AllowanceTotalAmount>',
    '    <cbc:PrepaidAmount currencyID="RSD">0.00</cbc:PrepaidAmount>',
    `    <cbc:PayableAmount currencyID="RSD">${money(breakdown.total)}</cbc:PayableAmount>`,
    '  </cac:LegalMonetaryTotal>',
    invoiceLines,
    '</Invoice>',
    '',
  ].join('\n')

  return { ok: true, xml }
}
