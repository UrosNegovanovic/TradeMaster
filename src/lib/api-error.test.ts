import { describe, expect, it } from 'vitest'
import { readApiErrorMessage } from '@/lib/api-error'

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

  it('maps an HTML 401 to Unauthorized instead of a parse crash', async () => {
    const response = new Response('<!DOCTYPE html>', {
      status: 401,
      headers: { 'content-type': 'text/html' },
    })
    await expect(readApiErrorMessage(response, 'Failed to create invoice')).resolves.toBe(
      'Unauthorized'
    )
  })
})
