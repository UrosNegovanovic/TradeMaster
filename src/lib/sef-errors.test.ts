import { describe, expect, it } from 'vitest'
import { parseSefErrorBody, sefErrorView } from './sef-errors'

const ctx = { invoiceId: 'inv-1', supportEmail: 'podrska@example.com' }
const http = (status: number, body: string) => ({ ok: false as const, kind: 'http' as const, status, body })

describe('parseSefErrorBody', () => {
  it('reads ProblemDetails, ErrorCode/Message and ASP.NET validation shapes', () => {
    expect(parseSefErrorBody('{"title":"Unauthorized","status":401,"detail":"You are not authorized.","code":"UNAUTHORIZED"}')).toEqual({
      code: 'UNAUTHORIZED',
      detail: 'You are not authorized.',
    })
    expect(parseSefErrorBody('{"ErrorCode":"InvoiceNumberNotUnique","Message":"Broj fakture već postoji"}')).toEqual({
      code: 'InvoiceNumberNotUnique',
      detail: 'Broj fakture već postoji',
    })
    expect(parseSefErrorBody('{"errors":{"Invoice":["ReceiverCompanyNotFound"]}}').code).toBe('ReceiverCompanyNotFound')
  })

  it('finds a known code inside plain text and keeps the text', () => {
    expect(parseSefErrorBody('Error: UBLUploadRequestIdDuplicate for request')).toEqual({
      code: 'UBLUploadRequestIdDuplicate',
      detail: 'Error: UBLUploadRequestIdDuplicate for request',
    })
    expect(parseSefErrorBody('')).toEqual({ code: null, detail: null })
  })
})

describe('sefErrorView', () => {
  it('buyer not in SEF → one sentence and a link to fix the invoice', () => {
    const view = sefErrorView(http(400, '{"code":"ReceiverCompanyNotFound"}'), ctx)
    expect(view.message).toMatch(/^Kupac nije registrovan u SEF-u/)
    expect(view.fix).toEqual({ href: '/invoices/inv-1/edit', label: 'Ispravi fakturu' })
    expect(view.outcomeUnknown).toBe(false)
  })

  it('wrong buyer matični broj → link to Kupci; seller mismatch and žiro-račun → Podešavanja', () => {
    expect(sefErrorView(http(400, '{"code":"UBLRegistrationCodeDoesNotHaveGoodLength"}'), ctx).fix?.href).toBe('/clients')
    expect(sefErrorView(http(400, '{"code":"EInvoiceSellerRegNumberNotTheSame"}'), ctx).fix?.href).toBe('/settings')
    expect(sefErrorView(http(400, '{"code":"BankAccountIncorrect"}'), ctx).fix?.href).toBe('/settings')
  })

  it('duplicate invoice number has its own sentence', () => {
    expect(sefErrorView(http(400, '{"code":"InvoiceNumberNotUnique"}'), ctx).message).toMatch(/već postoji u SEF-u/)
  })

  it('bad API key → Podešavanja', () => {
    const view = sefErrorView(http(401, '{"code":"UNAUTHORIZED"}'), ctx)
    expect(view.message).toMatch(/API ključ/)
    expect(view.fix?.href).toBe('/settings')
  })

  it('no answer, 5xx and 429 mean the outcome is unknown', () => {
    expect(sefErrorView({ ok: false, kind: 'network' }, ctx).outcomeUnknown).toBe(true)
    expect(sefErrorView(http(503, ''), ctx).outcomeUnknown).toBe(true)
    expect(sefErrorView(http(429, ''), ctx).outcomeUnknown).toBe(true)
  })

  it('a duplicate requestId means SEF already has the invoice', () => {
    expect(sefErrorView(http(400, '{"code":"UBLUploadRequestIdDuplicate"}'), ctx).alreadySent).toBe(true)
  })

  it('an unknown error is shown literally with the support address', () => {
    const view = sefErrorView(http(400, '{"Message":"Nešto potpuno novo"}'), ctx)
    expect(view.message).toContain('Nešto potpuno novo')
    expect(view.message).toContain('podrska@example.com')
    expect(view.fix).toBeNull()
  })
})
