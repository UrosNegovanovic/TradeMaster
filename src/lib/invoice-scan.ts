import { cleanBarcodeDigits, isIntakeBarcode } from '@/lib/barcode'
import { productsForPicker, type PickerProduct } from '@/lib/product-picker'

/**
 * Scanning into an invoice or proforma (ROADMAP A4): a read is looked up among the
 * company's products already loaded in the form; nothing is created or saved here.
 */
export type InvoiceScanMatch<T> =
  | { kind: 'found'; product: T }
  | { kind: 'not-found'; code: string }
  /** A short digit slice html5-qrcode emits mid-frame; ignore it silently. */
  | { kind: 'noise' }

export function findProductByScan<T extends PickerProduct>(products: T[], raw: string): InvoiceScanMatch<T> {
  const code = raw.trim()
  if (!code) return { kind: 'noise' }
  // One row per SKU (newest), like the invoice product picker.
  const candidates = productsForPicker(products)

  const exact = candidates.find((product) => product.sku.trim() === code)
  if (exact) return { kind: 'found', product: exact }

  const digits = cleanBarcodeDigits(code)
  if (isIntakeBarcode(code)) {
    const byDigits = candidates.find((product) => cleanBarcodeDigits(product.sku) === digits)
    if (byDigits) return { kind: 'found', product: byDigits }
  }

  // An all-digit read shorter than EAN-8 is camera noise, not a product the user meant.
  if (/^\d+$/.test(code) && !isIntakeBarcode(code)) return { kind: 'noise' }
  return { kind: 'not-found', code }
}

export type ScanLine = {
  id: string
  productId: string | null
  productName: string
}

export type ScanTarget =
  /** The product is already on a line: add one to its quantity. */
  | { action: 'increment'; lineId: string }
  /** Use the first empty line (the blank row a new form starts with). */
  | { action: 'fill'; lineId: string }
  | { action: 'append' }

/** `skuForLine` resolves a line's product to its SKU, so an older batch row of the same SKU still counts. */
export function scanTarget<L extends ScanLine>(
  lines: L[],
  sku: string,
  skuForLine: (line: L) => string | null
): ScanTarget {
  const same = lines.find((line) => line.productId !== null && skuForLine(line) === sku)
  if (same) return { action: 'increment', lineId: same.id }
  const empty = lines.find((line) => !line.productId && !line.productName.trim())
  if (empty) return { action: 'fill', lineId: empty.id }
  return { action: 'append' }
}
