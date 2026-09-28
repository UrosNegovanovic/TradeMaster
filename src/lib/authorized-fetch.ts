export type GetSessionToken = () => Promise<string | null | undefined>

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
