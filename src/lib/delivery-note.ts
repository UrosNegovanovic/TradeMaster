import { z } from 'zod'

/**
 * Field details of an otpremnica (ROADMAP A6), entered right before printing and not stored:
 * a delivery address when it differs from the buyer's address, and the number of packages.
 */
export const DELIVERY_ADDRESS_MAX = 200
export const DELIVERY_PACKAGES_MAX = 9999

export const deliveryNoteDetailsSchema = z.object({
  address: z
    .string()
    .trim()
    .max(DELIVERY_ADDRESS_MAX, `Adresa isporuke može imati najviše ${DELIVERY_ADDRESS_MAX} znakova.`),
  packages: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), 'Broj paketa mora biti ceo broj.')
    .transform((value) => (value === '' ? null : Number(value)))
    .refine(
      (value) => value === null || (value >= 1 && value <= DELIVERY_PACKAGES_MAX),
      `Broj paketa mora biti od 1 do ${DELIVERY_PACKAGES_MAX}.`
    ),
})

export type DeliveryNoteDetails = { address: string | null; packages: number | null }

export type DeliveryNoteParse = { ok: true; details: DeliveryNoteDetails } | { ok: false; error: string }

export function parseDeliveryNoteDetails(input: { address: string; packages: string }): DeliveryNoteParse {
  const parsed = deliveryNoteDetailsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Proverite podatke.' }
  return { ok: true, details: { address: parsed.data.address || null, packages: parsed.data.packages } }
}

/** The delivery address is printed only when it says something the buyer's address does not. */
export function deliveryAddressToPrint(details: DeliveryNoteDetails | undefined, clientAddress: string | null): string | null {
  const address = details?.address?.trim()
  if (!address) return null
  const same = (clientAddress ?? '').trim().toLowerCase() === address.toLowerCase()
  return same ? null : address
}
