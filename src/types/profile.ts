export type Profile = {
  id: string
  clerkUserId: string
  companyName: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  pib: string | null
  registrationNumber?: string | null
  giroAccount: string | null
  inVatSystem: boolean
  defaultPaymentDays?: number | null
  invoiceNote?: string | null
  logoUrl: string | null
  /** Manual billing: access until this day; null = no limit. Set by the owner, never by the user. */
  accessExpiresAt: Date | string | null
  createdAt: Date
  updatedAt: Date
}

export type ProfileUpdateInput = {
  companyName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  pib?: string | null
  registrationNumber?: string | null
  giroAccount?: string | null
  inVatSystem?: boolean
  logoUrl?: string | null
}
