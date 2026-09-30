/** Preview-only sources. These can paint in <img> but must not be written to profile.logoUrl. */
export function isPreviewOnlyImageSrc(value?: string | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return trimmed.startsWith('data:') || trimmed.startsWith('blob:')
}

/** http(s) and in-memory data: previews. Blob URLs die after the file input is cleared. */
export function isDisplayableImageSrc(value?: string | null): value is string {
  if (!value || value.trim() === '') return false
  const trimmed = value.trim()
  if (trimmed.startsWith('data:image/')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * URL we may persist on the profile.
 * `undefined` = omit (do not wipe an existing logo).
 * `null` = explicit clear.
 */
export function persistableImageUrl(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (isPreviewOnlyImageSrc(trimmed)) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return trimmed
  } catch {
    return undefined
  }
  return undefined
}
