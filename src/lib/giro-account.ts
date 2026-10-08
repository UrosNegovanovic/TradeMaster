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

export const INVALID_GIRO_MESSAGE = 'Žiro-račun nije ispravan. Unesite 18 cifara, npr. 160-0000000123456-54.'
