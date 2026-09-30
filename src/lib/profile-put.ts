import { persistableImageUrl } from '@/lib/image-src'
import type { ProfileFormData } from '@/lib/validations'

function emptyToNull(value?: string | null): string | null {
  if (value == null || value === '') return null
  return value
}

function hasOwn(value: unknown, key: string): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function logoUrlPatch(value: ProfileFormData['logoUrl']): { logoUrl?: string | null } {
  const persisted = persistableImageUrl(value)
  if (persisted === undefined) return {}
  return { logoUrl: persisted }
}

export function toProfileFormValues(profile?: {
  companyName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  pib?: string | null
  giroAccount?: string | null
  logoUrl?: string | null
} | null): ProfileFormData {
  return {
    companyName: profile?.companyName ?? '',
    contactEmail: profile?.contactEmail ?? '',
    contactPhone: profile?.contactPhone ?? '',
    address: profile?.address ?? '',
    pib: profile?.pib ?? '',
    giroAccount: profile?.giroAccount ?? '',
    logoUrl: persistableImageUrl(profile?.logoUrl) ?? '',
  }
}

/**
 * Fields for PUT /api/profile.
 * Omit logoUrl when the client did not send a persistable URL so we do not wipe a stored logo.
 */
export function profilePutFields(validated: ProfileFormData, rawBody: unknown = validated) {
  return {
    companyName: emptyToNull(validated.companyName),
    contactEmail: emptyToNull(validated.contactEmail),
    contactPhone: emptyToNull(validated.contactPhone),
    address: emptyToNull(validated.address),
    pib: emptyToNull(validated.pib),
    giroAccount: emptyToNull(validated.giroAccount),
    ...(hasOwn(rawBody, 'logoUrl') ? logoUrlPatch(validated.logoUrl) : {}),
  }
}

/** Client payload: always send a persistable logo URL, or omit preview-only srcs. */
export function profileSavePayload(data: ProfileFormData): ProfileFormData {
  const logoUrl = persistableImageUrl(data.logoUrl)
  if (logoUrl === undefined) {
    const { logoUrl: _dropped, ...rest } = data
    return rest
  }
  return { ...data, logoUrl }
}
