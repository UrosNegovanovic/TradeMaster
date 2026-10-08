import { describe, expect, it, vi } from 'vitest'
import {
  SEF_DEMO_BASE_URL,
  checkCompanyRegistered,
  getSalesInvoice,
  parseCompanyRegistered,
  parseSalesInvoice,
  parseSalesInvoiceId,
  sefConfig,
  sendSalesInvoiceUbl,
} from './sef-client'
import { canRemindPayment, fromSefSalesStatus, isLockedBySef, isSefStatusOpen } from './sef-status'

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe('sefConfig', () => {
  it('defaults to the demo environment', () => {
    expect(sefConfig(env({}))).toEqual({ baseUrl: SEF_DEMO_BASE_URL })
  })

  it('refuses production unless SEF_ALLOW_PRODUCTION=on, and any other host', () => {
    expect(sefConfig(env({ SEF_API_BASE_URL: 'https://efaktura.mfin.gov.rs' }))).toBeNull()
    expect(sefConfig(env({ SEF_API_BASE_URL: 'https://efaktura.mfin.gov.rs', SEF_ALLOW_PRODUCTION: 'on' }))).toEqual({
      baseUrl: 'https://efaktura.mfin.gov.rs',
    })
    expect(sefConfig(env({ SEF_API_BASE_URL: 'https://evil.example.com' }))).toBeNull()
    expect(sefConfig(env({ SEF_API_BASE_URL: 'http://demoefaktura.mfin.gov.rs' }))).toBeNull()
  })
})

describe('SEF requests', () => {
  const config = { baseUrl: SEF_DEMO_BASE_URL }

  it('posts the UBL with requestId, sendToCir=No and the ApiKey header', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"invoiceId":5,"purchaseInvoiceId":6,"salesInvoiceId":5}'))
    const result = await sendSalesInvoiceUbl(config, 'secret-key', { xml: '<Invoice/>', requestId: 'req-1' }, fetchImpl)
    expect(result).toMatchObject({ ok: true, status: 200 })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${SEF_DEMO_BASE_URL}/api/publicApi/sales-invoice/ubl?requestId=req-1&sendToCir=No`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('<Invoice/>')
    expect((init.headers as Record<string, string>).ApiKey).toBe('secret-key')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/xml')
  })

  it('reads the invoice status and checks a buyer by PIB and matični broj', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}'))
    await getSalesInvoice(config, 'k', '123', fetchImpl)
    await checkCompanyRegistered(config, 'k', { vatNumber: '101134702', registrationNumber: '07042001' }, fetchImpl)
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>
    expect(calls[0][0]).toBe(`${SEF_DEMO_BASE_URL}/api/publicApi/sales-invoice?invoiceId=123`)
    expect(calls[1][0]).toBe(`${SEF_DEMO_BASE_URL}/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura`)
    expect(JSON.parse(calls[1][1].body as string)).toEqual({ vatNumber: '101134702', registrationNumber: '07042001' })
  })

  it('reports a thrown fetch as "no answer" without the key in it', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    expect(await sendSalesInvoiceUbl(config, 'secret-key', { xml: '<x/>', requestId: 'r' }, fetchImpl)).toEqual({
      ok: false,
      kind: 'network',
    })
  })

  it('returns SEF error bodies as http errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"code":"X"}', { status: 400 }))
    expect(await getSalesInvoice(config, 'k', '1', fetchImpl)).toEqual({ ok: false, kind: 'http', status: 400, body: '{"code":"X"}' })
  })
})

describe('SEF response parsing', () => {
  it('keeps int64 ids exact', () => {
    expect(parseSalesInvoiceId('{"invoiceId":9007199254740993,"purchaseInvoiceId":1,"salesInvoiceId":9007199254740993}')).toBe(
      '9007199254740993'
    )
    expect(parseSalesInvoiceId('{"invoiceId":42}')).toBe('42')
    expect(parseSalesInvoiceId('{}')).toBeNull()
  })

  it('takes the comment that matches the status', () => {
    expect(parseSalesInvoice('{"status":"Rejected","comment":"Pogrešna količina"}')).toEqual({ status: 'Rejected', comment: 'Pogrešna količina' })
    expect(parseSalesInvoice('{"status":"Storno","stornoComment":"Greška u ceni","comment":"x"}').comment).toBe('Greška u ceni')
    expect(parseSalesInvoice('not json')).toEqual({ status: null, comment: null })
  })

  it('reads the buyer registration answer', () => {
    expect(parseCompanyRegistered('{"eFakturaRegisteredCompany":true}')).toBe(true)
    expect(parseCompanyRegistered('{"eFakturaRegisteredCompany":false}')).toBe(false)
    expect(parseCompanyRegistered('oops')).toBeNull()
  })
})

describe('SEF status mapping', () => {
  it('maps every SalesInvoiceStatus from the Swagger enum', () => {
    const map = Object.fromEntries(
      ['New', 'Draft', 'Sent', 'Paid', 'Mistake', 'OverDue', 'Archived', 'Sending', 'Deleted', 'Approved', 'Rejected', 'Cancelled', 'Storno', 'Unknown'].map(
        (status) => [status, fromSefSalesStatus(status)]
      )
    )
    expect(map).toEqual({
      New: 'SENDING',
      Draft: 'SENDING',
      Sent: 'SENT',
      Paid: 'SENT',
      Mistake: 'MISTAKE',
      OverDue: 'SENT',
      Archived: 'SENT',
      Sending: 'SENDING',
      Deleted: 'CANCELLED',
      Approved: 'APPROVED',
      Rejected: 'REJECTED',
      Cancelled: 'CANCELLED',
      Storno: 'STORNO',
      Unknown: 'UNKNOWN',
    })
    expect(fromSefSalesStatus('SomethingNew')).toBe('UNKNOWN')
  })

  it('locks sent invoices, refreshes open ones, and hides the reminder on rejected ones', () => {
    expect(isLockedBySef(null)).toBe(false)
    expect(isLockedBySef('SENDING')).toBe(true)
    expect(isSefStatusOpen('SENT')).toBe(true)
    expect(isSefStatusOpen('APPROVED')).toBe(false)
    expect(canRemindPayment('REJECTED')).toBe(false)
    expect(canRemindPayment(null)).toBe(true)
    expect(canRemindPayment('APPROVED')).toBe(true)
  })
})
