/** API intake/lookup requires at least an EAN-8 after stripping non-digits. */
export const MIN_INTAKE_BARCODE_DIGITS = 8

export function cleanBarcodeDigits(barcode: string): string {
  return barcode.replace(/\D/g, '')
}

/** Quick Scan posts this to `/api/products/fetch-by-barcode`; shorter reads are camera noise. */
export function isIntakeBarcode(barcode: string): boolean {
  return cleanBarcodeDigits(barcode).length >= MIN_INTAKE_BARCODE_DIGITS
}
