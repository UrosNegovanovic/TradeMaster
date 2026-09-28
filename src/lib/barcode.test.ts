import { describe, expect, it, vi } from 'vitest'
import { cleanBarcodeDigits, isIntakeBarcode } from './barcode'

describe('isIntakeBarcode', () => {
  it('accepts EAN-8 / UPC / EAN-13 after stripping spaces and punctuation', () => {
    expect(isIntakeBarcode('86044493')).toBe(true)
    expect(isIntakeBarcode('80052043')).toBe(true)
    expect(isIntakeBarcode('8604 4493')).toBe(true)
    expect(isIntakeBarcode('<80052043>')).toBe(true)
    expect(cleanBarcodeDigits('< 8005 2043 >')).toBe('80052043')
  })

  it('rejects partial camera reads that the scanner engine still treats as valid', () => {
    expect(isIntakeBarcode('8604449')).toBe(false)
    expect(isIntakeBarcode('8005')).toBe(false)
    expect(isIntakeBarcode('')).toBe(false)
  })
})
