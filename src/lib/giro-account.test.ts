import { describe, expect, it } from 'vitest'
import { normalizeGiroAccount } from './giro-account'

describe('normalizeGiroAccount', () => {
  it('the example in the message and placeholder is a valid account', () => {
    expect(normalizeGiroAccount('160-0000000123456-54')).toBe('160000000012345654')
  })

  it('accepts dashed and plain forms, refuses 13 digits and a wrong control number', () => {
    expect(normalizeGiroAccount('160-0000045454878-79')).toBe('160000004545487879')
    expect(normalizeGiroAccount('160000004545487879')).toBe('160000004545487879')
    expect(normalizeGiroAccount('1600045454878')).toBeNull()
    expect(normalizeGiroAccount('160-0000045454878-00')).toBeNull()
  })
})
