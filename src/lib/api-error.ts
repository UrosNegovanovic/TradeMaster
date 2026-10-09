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

/** Read a failed API body without throwing when Clerk/Vercel return HTML. */
export async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = (await response.text()).trim()
  if (text) {
    const fromJson = messageFromJson(text)
    if (fromJson) return fromJson
  }
  if (response.status === 401) return 'Unauthorized'
  return fallback
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
