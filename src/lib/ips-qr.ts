import QRCode from 'qrcode'

/**
 * NBS IPS QR ("QR kod za uplatu"): payment request the payer's banking app scans.
 * Spec fields used: K:PR, V:01, C:1 (UTF-8), R receiver account (18 digits), N name+address,
 * I currency+amount, SF payment code, S purpose, RO reference (model 00 + digits of the invoice number).
 */

const PAYMENT_CODE_GOODS_AND_SERVICES = '221'
const MAX_NAME_ADDRESS = 70
const MAX_PURPOSE = 35
const MAX_AMOUNT_LENGTH = 18
const MAX_REFERENCE_DIGITS = 20

/** ISO 7064 mod 97-10: a valid Serbian account (bank + account + control) is 1 mod 97 as one number. */
function hasValidControlDigits(account: string): boolean {
  let remainder = 0
  for (const digit of account) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

/** `160-0000000123456-78`, `160000000012345678` and spaced variants become the 18-digit form, or null. */
export function normalizeGiroAccount(value: string | null | undefined): string | null {
  const compact = (value ?? '').replace(/\s+/g, '')
  const dashed = /^(\d{3})-(\d{1,13})-(\d{2})$/.exec(compact)
  const digits = dashed ? `${dashed[1]}${dashed[2].padStart(13, '0')}${dashed[3]}` : compact
  if (!/^\d{18}$/.test(digits) || !hasValidControlDigits(digits)) {
    return null
  }
  return digits
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Name and address share one 70-char field separated by a line break. */
function receiverField(companyName: string, address: string | null | undefined): string {
  const name = clean(companyName).slice(0, MAX_NAME_ADDRESS)
  const addr = clean(address)
  const room = MAX_NAME_ADDRESS - name.length - 2
  return addr && room > 0 ? `${name}\r\n${addr.slice(0, room)}` : name
}

export type IpsQrInput = {
  giroAccount: string | null | undefined
  companyName: string | null | undefined
  address?: string | null
  amount: number
  invoiceNumber: string
}

/** Returns the QR payload, or null when the account, name or amount cannot make a valid payment request. */
export function buildIpsQrPayload(input: IpsQrInput): string | null {
  const account = normalizeGiroAccount(input.giroAccount)
  const name = clean(input.companyName)
  if (!account || !name) return null

  const cents = Math.round(input.amount * 100)
  if (!Number.isFinite(cents) || cents <= 0) return null
  const amount = `RSD${(cents / 100).toFixed(2).replace('.', ',')}`
  if (amount.length > MAX_AMOUNT_LENGTH) return null

  const parts = [
    'K:PR',
    'V:01',
    'C:1',
    `R:${account}`,
    `N:${receiverField(name, input.address)}`,
    `I:${amount}`,
    `SF:${PAYMENT_CODE_GOODS_AND_SERVICES}`,
    `S:${clean(`Faktura ${input.invoiceNumber}`).slice(0, MAX_PURPOSE)}`,
  ]

  const reference = input.invoiceNumber.replace(/\D/g, '').slice(0, MAX_REFERENCE_DIGITS)
  if (reference) parts.push(`RO:00${reference}`)

  return parts.join('|')
}

/** SVG path (1 unit per module, quiet zone excluded) and the module count, for drawing in PDF or HTML. */
export function ipsQrMatrix(payload: string): { size: number; path: string } {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  let path = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`
    }
  }
  return { size, path }
}
