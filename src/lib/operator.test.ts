import { describe, expect, it } from 'vitest'
import { operator, operatorLegal, operatorLegalLine } from './operator'

describe('operator', () => {
  it('keeps real tax data out of the code', () => {
    expect(operator).not.toHaveProperty('pib')
    expect(operator).not.toHaveProperty('address')
  })

  it('reads PIB, MB and address from the environment', () => {
    const legal = operatorLegal({ OPERATOR_PIB: ' 100000009 ', OPERATOR_MB: '21234567', OPERATOR_ADDRESS: 'Ulica 1, Beograd' } as unknown as NodeJS.ProcessEnv)
    expect(legal).toEqual({ pib: '100000009', mb: '21234567', address: 'Ulica 1, Beograd' })
    expect(operatorLegalLine(legal)).toBe('PIB 100000009, matični broj 21234567, adresa: Ulica 1, Beograd')
  })

  it('says honestly when the data is not set', () => {
    expect(operatorLegalLine(operatorLegal({} as NodeJS.ProcessEnv))).toMatch(/biće objavljeni/)
  })
})
