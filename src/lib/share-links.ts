/** Prefilled "send to" links for a share URL. Pure, so the message format is unit-tested. */

export type ShareTargets = {
  whatsapp: string
  viber: string
  email: string
}

export function shareMessage(text: string, url: string): string {
  const lead = text.trim()
  return lead ? `${lead}\n${url}` : url
}

/** A saved buyer's contact (ROADMAP A9.21): links go straight to them instead of a contact picker. */
export type ShareRecipient = { phone?: string | null; email?: string | null }

/**
 * International digits for wa.me from what people type in Serbia: "064 123 4567" → "381641234567",
 * "+381 64…" / "00381 64…" → "38164…". Null when it cannot be a phone number (8-15 digits).
 */
export function phoneForWhatsApp(phone: string | null | undefined): string | null {
  const raw = (phone ?? '').trim()
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    digits = `381${digits.slice(1)}`
  }
  return /^\d{8,15}$/.test(digits) ? digits : null
}

/** A plausible e-mail for mailto:, or null. */
export function emailForMailto(email: string | null | undefined): string | null {
  const value = (email ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null
}

export function buildShareTargets({
  url,
  text,
  subject,
  recipient,
}: {
  url: string
  text: string
  subject: string
  recipient?: ShareRecipient
}): ShareTargets {
  return buildMessageTargets(shareMessage(text, url), subject, recipient)
}

/** Same targets for a message that is already complete (it may or may not contain a link). */
export function buildMessageTargets(message: string, subject: string, recipient?: ShareRecipient): ShareTargets {
  const phone = phoneForWhatsApp(recipient?.phone)
  const email = emailForMailto(recipient?.email)
  return {
    whatsapp: `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(message)}`,
    // Viber has no web fallback and cannot prefill text for a given number; forward lets the owner pick the chat.
    viber: `viber://forward?text=${encodeURIComponent(message)}`,
    email: `mailto:${email ? encodeURIComponent(email) : ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
  }
}
