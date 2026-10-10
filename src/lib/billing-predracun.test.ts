import { describe, expect, it } from 'vitest'
import { startOfLocalDay } from './local-date'
import {
  NOT_IN_VAT_NOTE,
  TEST_MARK,
  chooseDelivery,
  isDeliverableRecipient,
  isPredracunDue,
  monthlyPriceRsd,
  predracunEmail,
  predracunLineName,
  predracunNote,
  predracunPeriod,
} from './billing-predracun'

const rate = { middle: 117.3657, date: '2026-10-10', listNumber: 193 }
const paušalac = { companyName: 'T&G Nest', pib: '123456789', giroAccount: '160-0000000000000-00', inVatSystem: false }
const inVat = { ...paušalac, inVatSystem: true }
const day = (ymd: string) => new Date(`${ymd}T10:00:00.000Z`)
const expiry = (ymd: string) => startOfLocalDay(day(ymd))

describe('isPredracunDue', () => {
  it('starts 7 days before expiry and covers the grace days, not read-only', () => {
    expect(isPredracunDue(expiry('2026-11-10'), day('2026-11-02'))).toBe(false)
    expect(isPredracunDue(expiry('2026-11-10'), day('2026-11-03'))).toBe(true)
    expect(isPredracunDue(expiry('2026-11-10'), day('2026-11-10'))).toBe(true)
    expect(isPredracunDue(expiry('2026-11-10'), day('2026-11-12'))).toBe(true)
    expect(isPredracunDue(expiry('2026-11-10'), day('2026-11-13'))).toBe(false)
    expect(isPredracunDue(null, day('2026-11-03'))).toBe(false)
  })
})

describe('predracunPeriod', () => {
  it('is the next calendar month, keeping the anchor day', () => {
    expect(predracunPeriod(expiry('2027-01-31'), null, day('2027-01-24'))).toMatchObject({ fromYmd: '2027-02-01', untilYmd: '2027-02-28' })
    expect(predracunPeriod(expiry('2027-02-28'), 31, day('2027-02-21'))).toMatchObject({ fromYmd: '2027-03-01', untilYmd: '2027-03-31' })
  })
})

describe('amount', () => {
  it('converts 20 € at the NBS middle rate, rounded to the para', () => {
    expect(monthlyPriceRsd(rate)).toBe('2347.31')
    expect(monthlyPriceRsd({ ...rate, middle: 117.1 })).toBe('2342.00')
  })

  it('names the period on the line and the rate, list and terms in the note', () => {
    expect(predracunLineName({ fromYmd: '2026-11-11', untilYmd: '2026-12-10' })).toBe(
      'TradeMaster pretplata, 1 mesec (od 11.11.2026. do 10.12.2026.)'
    )
    const note = predracunNote(rate, paušalac)
    expect(note).toContain('Cena: 20 € mesečno')
    expect(note).not.toContain('+ PDV')
    expect(note).toContain(NOT_IN_VAT_NOTE)
    expect(note).toContain('117,3657')
    expect(note).toContain('10.10.2026.')
    expect(note).toContain('kursna lista br. 193')
    expect(note).toMatch(/najkasnije narednog radnog dana/)
    expect(note).not.toMatch(/\.\./)
  })

  it('PDV follows only the issuer: + PDV and no "nije u sistemu" when the issuer is in the PDV system', () => {
    const note = predracunNote(rate, inVat)
    expect(note).toContain('20 € + PDV')
    expect(note).not.toContain(NOT_IN_VAT_NOTE)
  })

  it('says who issues it and that it is not a document of the buyer\'s business', () => {
    expect(predracunNote(rate, paušalac)).toContain('Predračun za korišćenje aplikacije TradeMaster, izdavalac T&G Nest. Nije dokument iz vašeg poslovanja.')
  })

  it('marks a test predračun first', () => {
    expect(predracunNote(rate, paušalac, true).startsWith(TEST_MARK)).toBe(true)
    expect(predracunNote(rate, paušalac)).not.toContain('TEST')
  })
})

describe('isDeliverableRecipient', () => {
  it('accepts real addresses and refuses test or placeholder ones', () => {
    expect(isDeliverableRecipient('kupac@firma.rs')).toBe(true)
    expect(isDeliverableRecipient(' Kupac@Firma.rs ')).toBe(true)
    expect(isDeliverableRecipient('demo+clerk_test@example.com')).toBe(false)
    expect(isDeliverableRecipient('e2e+clerk_test@gmail.com')).toBe(false)
    expect(isDeliverableRecipient('someone@example.com')).toBe(false)
    expect(isDeliverableRecipient('not-an-email')).toBe(false)
    expect(isDeliverableRecipient(null)).toBe(false)
  })
})

describe('predracunEmail', () => {
  const input = {
    buyerName: 'Kupac <d.o.o.>',
    invoiceNumber: 'PR-05/2026',
    expiryYmd: '2026-11-10',
    period: { fromYmd: '2026-11-11', untilYmd: '2026-12-10' },
    totalAmount: '2347.31',
    vatAmount: '0',
    rate,
    issuer: paušalac,
    link: 'https://trade-master-seven.vercel.app/shared/invoice/abc',
  }
  const email = predracunEmail(input)

  it('states number, amount without PDV (issuer is paušalac), payee, reference, deadline and the link', () => {
    expect(email.subject).toBe('TradeMaster: predračun PR-05/2026 za korišćenje aplikacije (pristup do 10.11.2026)')
    for (const fact of ['PR-05/2026', '2.347,31 RSD', 'obveznik nije u sistemu PDV-a', 'T&G Nest, PIB 123456789', '160-0000000000000-00', 'Poziv na broj: PR-05/2026', 'Rok za uplatu: 10.11.2026.', '11.11.2026. - 10.12.2026.', 'https://trade-master-seven.vercel.app/shared/invoice/abc']) {
      expect(email.text).toContain(fact)
    }
    expect(email.text).not.toContain('+ PDV')
  })

  it('shows PDV only when the issuer is in the PDV system', () => {
    const vat = predracunEmail({ ...input, issuer: inVat, totalAmount: '2816.77', vatAmount: '469.46' })
    expect(vat.text).toContain('2.816,77 RSD (20 € + PDV 469,46 RSD')
  })

  it('is clearly a bill for using TradeMaster from T&G Nest, not a document of the buyer', () => {
    expect(email.text).toContain('Predračun za korišćenje aplikacije TradeMaster, izdavalac T&G Nest. Nije dokument iz vašeg poslovanja.')
  })

  it('marks a test e-mail in the subject and the first line', () => {
    const test = predracunEmail({ ...input, test: true })
    expect(test.subject.startsWith('[TEST, ne plaćati] ')).toBe(true)
    expect(test.text.startsWith(TEST_MARK)).toBe(true)
  })

  it('is honest about activation and the choice not to continue', () => {
    expect(email.text).toMatch(/najkasnije narednog radnog dana/)
    expect(email.text).not.toMatch(/čim uplat|odmah/)
    expect(email.text).toMatch(/ne morate ništa da radite/)
  })

  it('escapes HTML and links the button to the predračun', () => {
    expect(email.html).toContain('Kupac &lt;d.o.o.&gt;')
    expect(email.html).not.toContain('<d.o.o.>')
    expect(email.html).toContain('href="https://trade-master-seven.vercel.app/shared/invoice/abc"')
    expect(email.html).toContain('T&amp;G Nest')
  })
})

describe('chooseDelivery (BILLING_AUTO_SEND switch and --test guard)', () => {
  it('reaches customers only with BILLING_AUTO_SEND=on', () => {
    expect(chooseDelivery({ autoSend: 'on', ownerAddresses: ['owner@gmail.com'] })).toEqual({ kind: 'customer' })
    for (const autoSend of [undefined, '', 'off', 'true', 'ON']) {
      expect(chooseDelivery({ autoSend, ownerAddresses: ['owner@gmail.com'] })).toEqual({ kind: 'owner', to: 'owner@gmail.com' })
    }
  })

  it('without the switch and without an owner address nothing is sent', () => {
    expect(chooseDelivery({ autoSend: undefined, ownerAddresses: [] })).toEqual({ kind: 'dry' })
    expect(chooseDelivery({ autoSend: undefined, ownerAddresses: ['not-an-email'] })).toEqual({ kind: 'dry' })
  })

  it('--test needs both --only and --to, and then goes only to --to whatever the switch says', () => {
    expect(() => chooseDelivery({ autoSend: 'on', ownerAddresses: [], test: {} })).toThrow(/--only <PIB> i --to <mejl>/)
    expect(() => chooseDelivery({ autoSend: 'on', ownerAddresses: [], test: { only: '112233446' } })).toThrow(/--to/)
    expect(() => chooseDelivery({ autoSend: 'on', ownerAddresses: [], test: { to: 'owner@gmail.com' } })).toThrow(/--only/)
    expect(() => chooseDelivery({ autoSend: 'on', ownerAddresses: [], test: { only: '112233446', to: 'x@example.com' } })).toThrow()
    expect(chooseDelivery({ autoSend: 'on', ownerAddresses: [], test: { only: '112233446', to: 'owner@gmail.com' } })).toEqual({
      kind: 'test',
      to: 'owner@gmail.com',
    })
  })
})
