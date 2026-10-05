import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  profile: { findUnique: vi.fn() },
  invoice: { findFirst: vi.fn() },
  client: { findFirst: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks,
}))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

function accountWithControl(bank: string, account13: string): string {
  const base = `${bank}${account13}`
  let remainder = 0
  for (const digit of `${base}00`) remainder = (remainder * 10 + Number(digit)) % 97
  return `${base}${String(98 - remainder).padStart(2, '0')}`
}

const profile = {
  id: 'profile-a',
  companyName: 'Demo Trgovina d.o.o.',
  pib: '123456789',
  registrationNumber: '12345678',
  address: 'Bulevar 12, 21000 Novi Sad',
  contactEmail: null,
  giroAccount: accountWithControl('160', '0000000123456'),
  // Expired accounts keep read-only exports.
  accessExpiresAt: new Date('2020-01-01'),
}

const invoice = {
  id: 'inv-1',
  documentType: 'INVOICE',
  status: 'UNPAID',
  invoiceNumber: '05/2026',
  createdAt: new Date('2026-10-05T10:00:00.000Z'),
  dueDate: new Date('2026-10-20T10:00:00.000Z'),
  vatEnabled: true,
  clientName: 'Market Primer d.o.o.',
  clientPib: '987654321',
  clientAddress: 'Kneza Miloša 1, Beograd',
  items: [{ productName: 'Kafa', quantity: 2, unitPrice: '100', discount: '0', vatRate: '20', total: '200' }],
}

const context = { params: Promise.resolve({ id: 'inv-1' }) }
const request = () => new NextRequest('http://localhost/api/invoices/inv-1/sef-xml')

describe('GET /api/invoices/:id/sef-xml (mocked Prisma/Clerk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId: 'user-a' } as never)
    mocks.profile.findUnique.mockResolvedValue(profile)
    mocks.invoice.findFirst.mockResolvedValue(invoice)
    mocks.client.findFirst.mockResolvedValue({ registrationNumber: '87654321' })
  })

  it('returns the XML as a download, buyer MB taken from the saved buyer with the same PIB', async () => {
    const response = await GET(request(), context)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="05_2026_SEF.xml"')
    expect(mocks.client.findFirst.mock.calls[0][0].where).toEqual({ profileId: 'profile-a', pib: '987654321' })
    const xml = await response.text()
    expect(xml).toContain('<cbc:CompanyID>87654321</cbc:CompanyID>')
    expect(xml).toContain('<cbc:PayableAmount currencyID="RSD">240.00</cbc:PayableAmount>')
  })

  it('explains what is missing when the buyer has no matični broj', async () => {
    mocks.client.findFirst.mockResolvedValue(null)
    const response = await GET(request(), context)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.problems).toEqual(['Matični broj kupca mora imati 8 cifara.'])
  })

  it('refuses a proforma and a draft', async () => {
    mocks.invoice.findFirst.mockResolvedValue({ ...invoice, documentType: 'PROFORMA' })
    expect((await GET(request(), context)).status).toBe(409)
    mocks.invoice.findFirst.mockResolvedValue({ ...invoice, status: 'DRAFT' })
    expect((await GET(request(), context)).status).toBe(409)
  })

  it('scopes the invoice to the signed-in company', async () => {
    mocks.invoice.findFirst.mockResolvedValue(null)
    const response = await GET(request(), context)
    expect(response.status).toBe(404)
    expect(mocks.invoice.findFirst.mock.calls[0][0].where).toEqual({ id: 'inv-1', profileId: 'profile-a' })
  })

  it('returns 401 without a session', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    expect((await GET(request(), context)).status).toBe(401)
  })
})
