import { describe, expect, it } from 'vitest'
import { isValidPib } from './pib'

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
