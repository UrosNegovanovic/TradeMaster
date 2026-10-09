import { describe, expect, it } from 'vitest'
import { HttpStatusError, readApiErrorMessage, retryUnlessClientError } from '@/lib/api-error'

describe('readApiErrorMessage', () => {
  it('reads the JSON error field from a failed API response', async () => {
    const response = new Response(JSON.stringify({ error: 'Nema dovoljno na stanju' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
    await expect(readApiErrorMessage(response, 'Failed to create invoice')).resolves.toBe(
      'Nema dovoljno na stanju'
    )
  })

  it('does not treat an HTML Clerk/Vercel page as JSON', async () => {
    const response = new Response('<!DOCTYPE html><html><body>Not Found</body></html>', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    })
    await expect(readApiErrorMessage(response, 'Failed to create invoice')).resolves.toBe(
      'Failed to create invoice'
    )
  })

  it('maps an HTML 401 to the sign-in message instead of a parse crash', async () => {
    const response = new Response('<!DOCTYPE html>', {
      status: 401,
      headers: { 'content-type': 'text/html' },
    })
    await expect(readApiErrorMessage(response, 'Failed to create invoice')).resolves.toBe(
      'Prijava je istekla. Prijavite se ponovo.'
    )
  })

  it('shows generic English API errors in Serbian and keeps specific ones', async () => {
    const json = (error: string, status = 500) =>
      new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } })
    await expect(readApiErrorMessage(json('Internal server error'), 'x')).resolves.toMatch(/greške na serveru/)
    await expect(readApiErrorMessage(json('Invoice not found', 404), 'x')).resolves.toMatch(/^Faktura nije pronađena/)
    await expect(readApiErrorMessage(json('Nema dovoljno na stanju', 400), 'x')).resolves.toBe('Nema dovoljno na stanju')
  })
})

describe('retryUnlessClientError', () => {
  it('never retries a missing or revoked link', () => {
    expect(retryUnlessClientError(0, new HttpStatusError(404, 'x'))).toBe(false)
    expect(retryUnlessClientError(0, new HttpStatusError(410, 'x'))).toBe(false)
  })

  it('retries a server or network error once', () => {
    expect(retryUnlessClientError(0, new HttpStatusError(503, 'x'))).toBe(true)
    expect(retryUnlessClientError(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(retryUnlessClientError(1, new TypeError('Failed to fetch'))).toBe(false)
  })
})
