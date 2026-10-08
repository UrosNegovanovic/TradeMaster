import { describe, expect, it } from 'vitest'
import { operatorDataProblems } from './operator'

describe('operatorDataProblems', () => {
  it('flags the placeholder PIB, wrong lengths and a "test" address', () => {
    expect(operatorDataProblems({ pib: '12312412312', registrationNumber: '', address: 'test' })).toEqual([
      'PIB je test vrednost',
      'PIB mora imati 9 cifara',
      'Matični broj mora imati 8 cifara',
      'Sedište nije uneto',
    ])
    expect(operatorDataProblems({ pib: '12345678', registrationNumber: '123456789', address: ' ' })).toHaveLength(3)
  })

  it('accepts real-looking APR data', () => {
    expect(
      operatorDataProblems({ pib: '112233445', registrationNumber: '66778899', address: 'Ulica 1, 11000 Beograd' })
    ).toEqual([])
  })

  // A1.4: once operator.ts has the APR data, replace this todo with
  //   it('operator.ts has real APR data', () => expect(operatorDataProblems(operator)).toEqual([]))
  // (import operator from './operator'). It must pass before launch.
  it.todo('operator.ts has real APR data (PIB 9 cifara, matični broj 8 cifara, sedište)')
})
