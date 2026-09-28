import { describe, expect, it, vi, afterEach } from 'vitest'
import { authorizedFetch } from './authorized-fetch'

describe('authorizedFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends credentials and a Bearer token when getToken resolves', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await authorizedFetch('/api/products/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }, async () => 'sess_test')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.credentials).toBe('include')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer sess_test')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('does not overwrite an Authorization header the caller already set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await authorizedFetch('/api/products', {
      headers: { Authorization: 'Bearer existing' },
    }, async () => 'sess_new')

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer existing')
  })
})
