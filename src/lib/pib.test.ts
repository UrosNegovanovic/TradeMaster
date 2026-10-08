import { describe, expect, it } from 'vitest'
import { isValidPib } from './pib'
import { clientWriteSchema, profileSchema } from './validations'

describe('isValidPib', () => {
  it('accepts PIBs with a correct control digit', () => {
    for (const pib of ['101134702', '123456788', '987654328', '123124128', ' 222222220 ']) {
      expect(isValidPib(pib)).toBe(true)
    }
  })

  it('refuses a wrong control digit, wrong length and non-digits', () => {
    for (const pib of ['123124129', '123456777', '123456789', '12345678', '1234567880', '12345678a', '', null, undefined]) {
      expect(isValidPib(pib)).toBe(false)
    }
  })
})

describe('PIB control digit on save', () => {
  it('Podešavanja refuse a company PIB with a wrong control digit', () => {
    const result = profileSchema.safeParse({ pib: '123124129' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('PIB nije ispravan (proverite cifre).')
    expect(profileSchema.safeParse({ pib: '123124128' }).success).toBe(true)
  })

  it('Kupci refuse a buyer PIB with a wrong control digit, and still allow no PIB', () => {
    expect(clientWriteSchema.safeParse({ name: 'Kupac', pib: '123456777' }).success).toBe(false)
    expect(clientWriteSchema.safeParse({ name: 'Kupac', pib: '123456770' }).success).toBe(true)
    expect(clientWriteSchema.safeParse({ name: 'Kupac', pib: '' }).success).toBe(true)
  })
})
