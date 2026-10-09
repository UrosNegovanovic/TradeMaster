import { isValidPib } from './pib'

/**
 * Field rules shared by Podešavanja (the company), Kupci (saved buyers) and the SEF XML check,
 * so a form never accepts what SEF refuses. Client-safe (no Prisma, no qrcode).
 */

export const PIB_LENGTH = 9
export const REGISTRATION_NUMBER_LENGTH = 8

/** Keeps only digits, for PIB and matični broj inputs. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Error for a PIB, or null when it is valid. */
export function pibProblem(value: string | null | undefined): string | null {
  const pib = (value ?? '').trim()
  if (!pib) return 'PIB je obavezan.'
  if (!/^\d+$/.test(pib)) return 'PIB sme da sadrži samo cifre.'
  if (pib.length !== PIB_LENGTH) return `PIB mora imati tačno ${PIB_LENGTH} cifara (uneto: ${pib.length}).`
  if (!isValidPib(pib)) return 'PIB nije ispravan: poslednja (kontrolna) cifra ne odgovara. Proverite PIB.'
  return null
}

/** Error for a matični broj, or null when it is valid. */
export function registrationNumberProblem(value: string | null | undefined): string | null {
  const number = (value ?? '').trim()
  if (!number) return 'Matični broj je obavezan.'
  if (!/^\d+$/.test(number)) return 'Matični broj sme da sadrži samo cifre.'
  if (number.length !== REGISTRATION_NUMBER_LENGTH) {
    return `Matični broj mora imati tačno ${REGISTRATION_NUMBER_LENGTH} cifara (uneto: ${number.length}).`
  }
  return null
}

/** "Ulica i broj, 11000 Beograd": SEF needs the city after a comma. */
export function addressHasCity(value: string | null | undefined): boolean {
  const parts = (value ?? '').split(',').map((part) => part.trim())
  return parts.length > 1 && parts[0] !== '' && parts[parts.length - 1] !== ''
}

export const ADDRESS_CITY_MESSAGE =
  'Unesite ulicu i broj, zarez, pa poštanski broj i mesto, npr. "Kralja Petra I 10, 11000 Beograd".'

/**
 * "Bulevar 12, 11000 Beograd" -> street "Bulevar 12", city "Beograd" (postal code split off).
 * One-part addresses use the same text for both, because SEF requires a city.
 */
export function splitSerbianAddress(address: string | null | undefined): {
  street: string
  city: string
  postalZone: string | null
} {
  const parts = (address ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return { street: '', city: '', postalZone: null }
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  const postal = /^(\d{5})\s+(.+)$/.exec(last)
  const city = postal ? postal[2] : last
  const street = parts.length > 1 ? parts.slice(0, -1).join(', ') : parts[0]
  return { street, city, postalZone: postal ? postal[1] : null }
}
