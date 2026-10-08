/**
 * Serbian PIB: 8 digits + a control digit (ISO 7064 MOD 11,10). SEF refuses a PIB whose
 * control digit is wrong, so a 9-digit typo is caught here instead of by SEF.
 */
export function isValidPib(value: string | null | undefined): boolean {
  const pib = (value ?? '').trim()
  if (!/^\d{9}$/.test(pib)) return false
  let product = 10
  for (const digit of pib.slice(0, 8)) {
    let sum = (product + Number(digit)) % 10
    if (sum === 0) sum = 10
    product = (sum * 2) % 11
  }
  return (11 - product) % 10 === Number(pib[8])
}

export const INVALID_PIB_MESSAGE = 'PIB nije ispravan (proverite cifre).'
