import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  invoice: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  client: { findFirst: vi.fn() },
  sefCredential: { findUnique: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks }))

import { auth } from '@clerk/nextjs/server'
import { resetRateLimitStore } from '@/lib/rate-limit'
import { encryptSefApiKey } from '@/lib/sef-key-crypto'
import { GET, POST } from './route'

const master = randomBytes(32)
const API_KEY = 'sef-demo-key-1234567880'

function accountWithControl(bank: string, account13: string): string {
  const base = `${bank}${account13}`
  let remainder = 0
  for (const digit of `${base}00`) remainder = (remainder * 10 + Number(digit)) % 97
  return `${base}${String(98 - remainder).padStart(2, '0')}`
}

const profile = {
  id: 'profile-a',
  companyName: 'Demo Trgovina d.o.o.',
  pib: '123456788',
  registrationNumber: '12345678',
  address: 'Bulevar 12, 21000 Novi Sad',
  contactEmail: null,
  giroAccount: accountWithControl('160', '0000000123456'),
  accessExpiresAt: null,
}

const invoice = {
  id: 'inv-1',
  documentType: 'INVOICE',
  status: 'UNPAID',
  invoiceNumber: '05/2026',
  createdAt: new Date('2026-10-05T10:00:00.000Z'),
  dueDate: new Date('2026-10-20T10:00:00.000Z'),
  vatEnabled: true,
  totalAmount: '240.00',
  clientName: 'Market Primer d.o.o.',
  clientPib: '987654328',
  clientAddress: 'Kneza Miloša 1, Beograd',
  sefStatus: null,
  sefStatusComment: null,
  sefSentAt: null,
  sefStatusCheckedAt: null,
  sefLastError: null,
  sefInvoiceId: null,
  sefRequestId: null,
  items: [{ productName: 'Kafa', quantity: 2, unitPrice: '100', discount: '0', vatRate: '20', total: '200' }],
}

const context = { params: Promise.resolve({ id: 'inv-1' }) }
const post = (body: unknown = { confirm: true }) =>
  new NextRequest('http://localhost/api/invoices/inv-1/sef', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const get = (query = '') => new NextRequest(`http://localhost/api/invoices/inv-1/sef${query}`)

const fetchMock = vi.fn()

describe('/api/invoices/:id/sef (mocked Prisma, Clerk and SEF)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitStore()
    vi.stubEnv('SEF_KEY_ENCRYPTION_KEY', master.toString('base64'))
    vi.stubEnv('SEF_API_BASE_URL', '')
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.invoice.findFirst.mockResolvedValue(invoice)
    mocks.client.findFirst.mockResolvedValue({ registrationNumber: '87654321' })
    mocks.sefCredential.findUnique.mockResolvedValue({
      profileId: profile.id,
      apiKeyCiphertext: encryptSefApiKey(API_KEY, profile.id, master),
    })
    mocks.invoice.updateMany.mockResolvedValue({ count: 1 })
    mocks.invoice.findFirstOrThrow.mockResolvedValue({ ...invoice, sefStatus: 'SENT', sefInvoiceId: '555' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends the UBL to the demo SEF with the decrypted key and a requestId, and never returns the key', async () => {
    fetchMock.mockResolvedValue(new Response('{"invoiceId":555,"purchaseInvoiceId":1,"salesInvoiceId":555}'))
    const response = await POST(post(), context)
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).not.toContain(API_KEY)
    expect(JSON.parse(text)).toMatchObject({ message: 'Faktura je poslata u SEF.', state: { status: 'SENT', sefInvoiceId: '555' } })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/^https:\/\/demoefaktura\.mfin\.gov\.rs\/api\/publicApi\/sales-invoice\/ubl\?requestId=[\w-]+&sendToCir=No$/)
    expect((init.headers as Record<string, string>).ApiKey).toBe(API_KEY)
    expect(String(init.body)).toContain('<cbc:ID>05/2026</cbc:ID>')
    // Claim first (conditional on sefStatus null), then mark sent with the same requestId.
    const claim = mocks.invoice.updateMany.mock.calls[0][0]
    expect(claim.where).toMatchObject({ id: 'inv-1', profileId: 'profile-a', sefStatus: null, documentType: 'INVOICE' })
    const requestId = new URL(url).searchParams.get('requestId')
    expect(claim.data.sefRequestId).toBe(requestId)
    expect(mocks.invoice.updateMany.mock.calls[1][0].where.sefRequestId).toBe(requestId)
  })

  it('does not call SEF when another send already claimed the invoice', async () => {
    mocks.invoice.updateMany.mockResolvedValueOnce({ count: 0 })
    mocks.invoice.findFirstOrThrow.mockResolvedValue({
      ...invoice,
      sefStatus: 'SENDING',
      sefRequestId: 'req-x',
      sefSentAt: new Date(),
    })
    const response = await POST(post(), context)
    expect(response.status).toBe(409)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('explains a SEF refusal in Serbian with a link to fix it', async () => {
    fetchMock.mockResolvedValue(new Response('{"code":"ReceiverCompanyNotFound"}', { status: 400 }))
    mocks.invoice.findFirstOrThrow.mockResolvedValue({ ...invoice, sefLastError: 'x' })
    const response = await POST(post(), context)
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/^Kupac nije registrovan u SEF-u/),
      fix: { href: '/invoices/inv-1/edit' },
    })
  })

  it('refuses a predračun, a draft, a missing confirmation and a missing key, without calling SEF', async () => {
    mocks.invoice.findFirst.mockResolvedValueOnce({ ...invoice, documentType: 'PROFORMA' })
    expect((await POST(post(), context)).status).toBe(409)
    mocks.invoice.findFirst.mockResolvedValueOnce({ ...invoice, status: 'DRAFT' })
    expect((await POST(post(), context)).status).toBe(409)
    expect((await POST(post({}), context)).status).toBe(400)
    mocks.sefCredential.findUnique.mockResolvedValueOnce(null)
    expect((await POST(post(), context)).status).toBe(409)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the same problems as the XML download and does not send', async () => {
    mocks.client.findFirst.mockResolvedValue(null)
    const response = await POST(post(), context)
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({ problems: expect.arrayContaining([expect.stringMatching(/[Mm]atični broj kupca/)]) })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is read-only for expired accounts', async () => {
    mocks.profile.findUnique.mockResolvedValue({ ...profile, accessExpiresAt: new Date('2020-01-01') })
    expect((await POST(post(), context)).status).toBe(402)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('GET checks whether the buyer is registered on SEF before sending', async () => {
    fetchMock.mockResolvedValue(new Response('{"eFakturaRegisteredCompany":false}'))
    const response = await GET(get(), context)
    const body = await response.json()
    expect(body).toMatchObject({ enabled: true, precheck: { problems: [], buyerRegistered: false } })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura')
    expect(JSON.parse(String(init.body))).toEqual({ vatNumber: '987654328', registrationNumber: '87654321' })
    expect(JSON.stringify(body)).not.toContain(API_KEY)
  })

  it('GET ?refresh=1 stores the status and the buyer’s rejection reason', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ ...invoice, sefStatus: 'SENT', sefInvoiceId: '555' })
    mocks.invoice.update.mockResolvedValue({ ...invoice, sefStatus: 'REJECTED', sefInvoiceId: '555', sefStatusComment: 'Pogrešna cena' })
    fetchMock.mockResolvedValue(new Response('{"invoiceId":555,"status":"Rejected","comment":"Pogrešna cena"}'))
    const response = await GET(get('?refresh=1'), context)
    expect(mocks.invoice.update.mock.calls[0][0].data).toMatchObject({ sefStatus: 'REJECTED', sefStatusComment: 'Pogrešna cena' })
    await expect(response.json()).resolves.toMatchObject({ state: { status: 'REJECTED', comment: 'Pogrešna cena' } })
  })

  it('without a saved key the invoice works as before: SEF panel off, no SEF call, no data checks', async () => {
    mocks.sefCredential.findUnique.mockResolvedValue(null)
    // Data SEF would refuse (no žiro-račun, buyer without PIB) must not matter without a key.
    mocks.profile.findUnique.mockResolvedValue({ ...profile, giroAccount: null })
    mocks.invoice.findFirst.mockResolvedValue({ ...invoice, clientPib: null })
    const body = await (await GET(get('?refresh=auto'), context)).json()
    expect(body).toMatchObject({ enabled: false, precheck: null, state: { status: null } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.invoice.update).not.toHaveBeenCalled()

    const sent = await POST(post(), context)
    expect(sent.status).toBe(409)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('GET reports SEF off when the server has no master key', async () => {
    vi.stubEnv('SEF_KEY_ENCRYPTION_KEY', '')
    const body = await (await GET(get(), context)).json()
    expect(body.enabled).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
