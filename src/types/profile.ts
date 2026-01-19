export type Profile = {
  id: string
  clerkUserId: string
  companyName: string | null
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  pib: string | null
  logoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type ProfileUpdateInput = {
  companyName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  pib?: string | null
  logoUrl?: string | null
}
