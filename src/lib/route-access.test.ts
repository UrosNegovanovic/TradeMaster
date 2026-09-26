import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { shouldProtectHtmlRoute } from '@/lib/route-access'

function request(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

describe('shouldProtectHtmlRoute', () => {
  it('does not protect API routes so handlers can return JSON 401', () => {
    expect(shouldProtectHtmlRoute(request('/api/invoices'))).toBe(false)
    expect(shouldProtectHtmlRoute(request('/api/invoices/abc'))).toBe(false)
    expect(shouldProtectHtmlRoute(request('/api/products'))).toBe(false)
  })

  it('still protects dashboard HTML pages', () => {
    expect(shouldProtectHtmlRoute(request('/invoices/new'))).toBe(true)
    expect(shouldProtectHtmlRoute(request('/warehouse'))).toBe(true)
  })

  it('leaves public pages and public catalog APIs unprotected', () => {
    expect(shouldProtectHtmlRoute(request('/'))).toBe(false)
    expect(shouldProtectHtmlRoute(request('/sign-in'))).toBe(false)
    expect(shouldProtectHtmlRoute(request('/api/public/catalogs/abc'))).toBe(false)
    expect(shouldProtectHtmlRoute(request('/api/shared/catalog/token'))).toBe(false)
  })
})
