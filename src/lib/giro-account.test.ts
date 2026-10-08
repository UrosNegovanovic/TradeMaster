import { describe, expect, it } from 'vitest'
import { normalizeGiroAccount } from './giro-account'
import { profileSchema } from './validations'

const pib = '123124128'

describe('žiro-račun on save (Podešavanja)', () => {
  it('the example in the message and placeholder is a valid account', () => {
    expect(normalizeGiroAccount('160-0000000123456-54')).toBe('160000000012345654')
  })

  it('refuses an account that is not 18 digits with a valid control number', () => {
    for (const giroAccount of ['1600045454878', '160-0000045454878-00']) {
      const result = profileSchema.safeParse({ pib, giroAccount })
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0]?.message).toContain('Žiro-račun nije ispravan')
    }
  })

  it('accepts a valid account in any written form, and no account at all', () => {
    for (const giroAccount of ['160-0000045454878-79', '160000004545487879', '', null, undefined]) {
      expect(profileSchema.safeParse({ pib, giroAccount }).success).toBe(true)
    }
  })
})
