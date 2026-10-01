export type GetSessionToken = () => Promise<string | null | undefined>
export type SessionFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Same-origin fetch that still sends Clerk cookies and a Bearer token when the session cookie is dropped (PWA / mobile). */
export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  getToken?: GetSessionToken
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (getToken && !headers.has('Authorization')) {
    const token = await getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  })
}

export function bindAuthorizedFetch(getToken?: GetSessionToken): SessionFetch {
  return (input, init) => authorizedFetch(input, init ?? {}, getToken)
}
