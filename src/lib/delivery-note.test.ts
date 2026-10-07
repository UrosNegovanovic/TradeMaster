import { describe, expect, it } from 'vitest'
import { deliveryAddressToPrint, parseDeliveryNoteDetails } from './delivery-note'

describe('parseDeliveryNoteDetails', () => {
  it('accepts empty fields as "not given"', () => {
    expect(parseDeliveryNoteDetails({ address: '  ', packages: '' })).toEqual({
      ok: true,
      details: { address: null, packages: null },
    })
  })

  it('trims the address and reads the package count', () => {
    expect(parseDeliveryNoteDetails({ address: ' Magacin 2, Zemun ', packages: ' 3 ' })).toEqual({
      ok: true,
      details: { address: 'Magacin 2, Zemun', packages: 3 },
    })
  })

  it('rejects a non-integer, zero or huge package count', () => {
    for (const packages of ['1.5', '-2', 'dva', '0', '10000']) {
      expect(parseDeliveryNoteDetails({ address: '', packages }).ok).toBe(false)
    }
  })

  it('rejects an address longer than 200 characters', () => {
    const result = parseDeliveryNoteDetails({ address: 'a'.repeat(201), packages: '' })
    expect(result).toEqual({ ok: false, error: 'Adresa isporuke može imati najviše 200 znakova.' })
  })
})

describe('deliveryAddressToPrint', () => {
  it('prints a different address and skips one equal to the buyer address', () => {
    expect(deliveryAddressToPrint({ address: 'Gradilište, Novi Sad', packages: null }, 'Beograd 1')).toBe(
      'Gradilište, Novi Sad'
    )
    expect(deliveryAddressToPrint({ address: ' beograd 1 ', packages: null }, 'Beograd 1')).toBeNull()
    expect(deliveryAddressToPrint(undefined, 'Beograd 1')).toBeNull()
  })
})
