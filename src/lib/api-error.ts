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
