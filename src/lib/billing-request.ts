import { operator } from '@/lib/operator'
import { contactLinks } from '@/lib/landing-copy'

type BillingProfile = { companyName?: string | null; pib?: string | null } | null | undefined

/** Message the merchant sends to ask for the monthly invoice (manual billing). */
export function billingRequestText(profile: BillingProfile): string {
  const company = profile?.companyName?.trim() || 'moja firma'
  const pib = profile?.pib?.trim() ? `, PIB ${profile.pib.trim()}` : ''
  return `Pozdrav, molim račun za TradeMaster pretplatu (30 dana) za ${company}${pib}. Hvala!`
}

export function billingMailto(profile: BillingProfile): string {
  const subject = 'TradeMaster: račun za pretplatu'
  return `mailto:${operator.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(billingRequestText(profile))}`
}

/** WhatsApp chat with the operator, message prefilled; null when the operator phone is not usable. */
export function billingWhatsApp(profile: BillingProfile): string | null {
  const links = contactLinks(operator.phone)
  return links ? `${links.whatsapp}?text=${encodeURIComponent(billingRequestText(profile))}` : null
}
