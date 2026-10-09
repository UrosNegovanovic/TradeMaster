type ApiErrorBody = {
  error?: unknown
}

function messageFromJson(text: string): string | null {
  try {
    const data = JSON.parse(text) as ApiErrorBody
    return typeof data.error === 'string' && data.error.trim() ? data.error : null
  } catch {
    return null
  }
}

/**
 * Generic English errors from the API (kept there as the API contract) in the words the user reads.
 * Specific messages are already Serbian; anything unknown passes through unchanged.
 */
const SERBIAN_API_ERRORS: Record<string, string> = {
  Unauthorized: 'Prijava je istekla. Prijavite se ponovo.',
  Forbidden: 'Nemate pristup ovom podatku.',
  'Profile not found': 'Podaci firme još nisu učitani. Otvorite Početnu pa pokušajte ponovo.',
  'Internal server error': 'Došlo je do greške na serveru. Pokušajte ponovo.',
  'Validation error': 'Podaci nisu ispravni. Proverite polja i pokušajte ponovo.',
  'Invalid input': 'Podaci nisu ispravni. Proverite polja i pokušajte ponovo.',
  'Invalid JSON': 'Podaci nisu ispravni. Proverite polja i pokušajte ponovo.',
  'Too many requests': 'Previše zahteva za kratko vreme. Sačekajte malo pa pokušajte ponovo.',
  'Not found': 'Podatak nije pronađen. Možda je obrisan.',
  'Invoice not found': 'Faktura nije pronađena. Možda je obrisana.',
  'Catalog not found': 'Katalog nije pronađen. Možda je obrisan.',
  'Product not found': 'Proizvod nije pronađen. Možda je obrisan.',
  'Client not found': 'Kupac nije pronađen. Možda je obrisan.',
  'Insufficient stock': 'Nema dovoljno robe na stanju.',
  'Product with this SKU already exists': 'Proizvod sa ovom šifrom već postoji.',
  'One or more products not found or do not belong to you': 'Neki izabrani proizvodi više ne postoje. Osvežite stranicu.',
  'File too large': 'Fajl je prevelik (najviše 5 MB).',
  'Unsupported image type': 'Ova vrsta slike nije podržana. Koristite JPG, PNG, WEBP ili GIF.',
  'Upload failed': 'Slika nije otpremljena. Pokušajte ponovo.',
}

export function toSerbianApiError(message: string): string {
  return SERBIAN_API_ERRORS[message.trim()] ?? message
}

/** Read a failed API body without throwing when Clerk/Vercel return HTML. */
export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = (await response.text()).trim()
  if (text) {
    const fromJson = messageFromJson(text)
    if (fromJson) return toSerbianApiError(fromJson)
  }
  if (response.status === 401) return SERBIAN_API_ERRORS.Unauthorized
  return toSerbianApiError(fallback)
}

/** A failed fetch that keeps its HTTP status, so callers can tell "gone" from "try again". */
export class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

/**
 * TanStack Query retry for public links: a missing or revoked link (4xx) is final and shows its message
 * at once; a network or server error is retried once.
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof HttpStatusError && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}
