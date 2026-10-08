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

export function buildShareTargets({ url, text, subject }: { url: string; text: string; subject: string }): ShareTargets {
  return buildMessageTargets(shareMessage(text, url), subject)
}

/** Same targets for a message that is already complete (it may or may not contain a link). */
export function buildMessageTargets(message: string, subject: string): ShareTargets {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    // Viber has no web fallback; the link opens the installed app (phone or desktop).
    viber: `viber://forward?text=${encodeURIComponent(message)}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
  }
}
