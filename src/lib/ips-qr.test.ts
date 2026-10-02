import { describe, expect, it } from 'vitest'
import { buildIpsQrPayload, ipsQrMatrix, normalizeGiroAccount } from './ips-qr'

/** Builds an account whose control digits satisfy mod 97-10. */
function accountWithControl(bank: string, account13: string): string {
  const base = `${bank}${account13}`
  let remainder = 0
  for (const digit of `${base}00`) remainder = (remainder * 10 + Number(digit)) % 97
  const control = String(98 - remainder).padStart(2, '0')
  return `${base}${control}`
}

const digits18 = accountWithControl('160', '0000000123456')
const dashed = `${digits18.slice(0, 3)}-${digits18.slice(3, 16)}-${digits18.slice(16)}`

describe('normalizeGiroAccount', () => {
  it('accepts dashed, spaced and 18-digit forms with valid control digits', () => {
    expect(normalizeGiroAccount(dashed)).toBe(digits18)
    expect(normalizeGiroAccount(` ${digits18} `)).toBe(digits18)
    expect(normalizeGiroAccount(`160-123456-${digits18.slice(16)}`)).toBe(digits18) // short middle part is zero-padded
  })

  it('pads a short middle part with zeros', () => {
    const short = accountWithControl('265', '0000001234567')
    expect(normalizeGiroAccount(`265-1234567-${short.slice(16)}`)).toBe(short)
  })

  it('rejects wrong control digits, letters and empty input', () => {
    const bad = `${digits18.slice(0, 16)}${digits18.slice(16) === '00' ? '01' : '00'}`
    expect(normalizeGiroAccount(bad)).toBeNull()
    expect(normalizeGiroAccount('abc')).toBeNull()
    expect(normalizeGiroAccount('')).toBeNull()
    expect(normalizeGiroAccount(null)).toBeNull()
  })
})

describe('buildIpsQrPayload', () => {
  const base = {
    giroAccount: dashed,
    companyName: 'Trgovina Đorđević DOO',
    address: 'Knez Mihailova 1, Beograd',
    amount: 12000,
    invoiceNumber: '2026-001',
  }

  it('builds the NBS fields in order', () => {
    expect(buildIpsQrPayload(base)).toBe(
      `K:PR|V:01|C:1|R:${digits18}|N:Trgovina Đorđević DOO\r\nKnez Mihailova 1, Beograd|I:RSD12000,00|SF:221|S:Faktura 2026-001|RO:002026001`
    )
  })

  it('formats cents with a decimal comma and no thousand separators', () => {
    expect(buildIpsQrPayload({ ...base, amount: 1234.5 })).toContain('|I:RSD1234,50|')
    expect(buildIpsQrPayload({ ...base, amount: 19.99 })).toContain('|I:RSD19,99|')
  })

  it('returns null without a valid account, name or positive amount', () => {
    expect(buildIpsQrPayload({ ...base, giroAccount: '123' })).toBeNull()
    expect(buildIpsQrPayload({ ...base, giroAccount: null })).toBeNull()
    expect(buildIpsQrPayload({ ...base, companyName: ' ' })).toBeNull()
    expect(buildIpsQrPayload({ ...base, amount: 0 })).toBeNull()
    expect(buildIpsQrPayload({ ...base, amount: Number.NaN })).toBeNull()
  })

  it('strips separators from free text and caps name+address at 70 chars', () => {
    const payload = buildIpsQrPayload({ ...base, companyName: 'A|B\nC', address: 'x'.repeat(200) })!
    const name = /\|N:([^|]*)\|/.exec(payload)![1]
    expect(name.startsWith('A B C\r\n')).toBe(true)
    expect(name.length).toBe(70)
  })

  it('omits the reference when the invoice number has no digits', () => {
    expect(buildIpsQrPayload({ ...base, invoiceNumber: 'ABC' })).not.toContain('|RO:')
  })
})

describe('ipsQrMatrix', () => {
  it('returns a square module grid and a drawable path', () => {
    const { size, path } = ipsQrMatrix('K:PR|V:01|C:1')
    expect(size).toBeGreaterThanOrEqual(21)
    expect(path.startsWith('M')).toBe(true)
  })
})
