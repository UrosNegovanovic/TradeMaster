import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { accessExpiredResponse } from '@/lib/access-guard'
import { enforceRateLimit, rateLimits } from '@/lib/rate-limit'
import { operator } from '@/lib/operator'
import { buildInvoiceSefXml, buyerRegistrationNumber, sefDocumentRefusal } from '@/lib/sef-invoice-xml'
import { hasSefApiKey, loadSefApiKey, prismaSefSendStore, sefEncryptionAvailable } from '@/lib/sef-server'
import {
  checkCompanyRegistered,
  getSalesInvoice,
  parseCompanyRegistered,
  parseSalesInvoice,
  sefConfig,
  sendSalesInvoiceUbl,
} from '@/lib/sef-client'
import { sefErrorView } from '@/lib/sef-errors'
import { sefSendingAllowed } from '@/lib/sef-access'
import { sendInvoiceToSef } from '@/lib/sef-send'
import { fromSefSalesStatus, isSefStatus, isSefStatusOpen } from '@/lib/sef-status'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }

const idSchema = z.string().min(1).max(64)
/** The phone flow asks for confirmation (amount + buyer) before this call. */
const sendSchema = z.object({ confirm: z.literal(true) })

async function load(context: Context) {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }) }
  const profile = await prisma.profile.findUnique({ where: { clerkUserId: userId } })
  if (!profile) return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404, headers }) }
  const id = idSchema.safeParse((await context.params).id)
  if (!id.success) return { error: NextResponse.json({ error: 'Faktura nije pronađena.' }, { status: 404, headers }) }
  const invoice = await prisma.invoice.findFirst({
    where: { id: id.data, profileId: profile.id },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  if (!invoice) return { error: NextResponse.json({ error: 'Faktura nije pronađena.' }, { status: 404, headers }) }
  return { profile, invoice }
}

function stateOf(invoice: {
  sefStatus: string | null
  sefStatusComment: string | null
  sefSentAt: Date | null
  sefStatusCheckedAt: Date | null
  sefLastError: string | null
  sefInvoiceId: string | null
}) {
  return {
    status: isSefStatus(invoice.sefStatus) ? invoice.sefStatus : null,
    comment: invoice.sefStatusComment,
    sentAt: invoice.sefSentAt,
    checkedAt: invoice.sefStatusCheckedAt,
    lastError: invoice.sefLastError,
    sefInvoiceId: invoice.sefInvoiceId,
  }
}

/**
 * State + pre-send check. `?refresh=1|auto` asks SEF for the current status of a sent invoice.
 * Reading SEF stays allowed for expired accounts (read-only access); it only updates our cached status.
 */
export async function GET(request: NextRequest, context: Context) {
  const limited = await enforceRateLimit(request, rateLimits.sefRead)
  if (limited) return limited
  const loaded = await load(context)
  if (loaded.error) return loaded.error
  const { profile } = loaded
  let invoice = loaded.invoice

  const config = sefConfig()
  const keySaved = await hasSefApiKey(prisma, profile.id)
  const enabled = Boolean(config && sefEncryptionAvailable() && keySaved && sefSendingAllowed(profile.id))
  const refusal = sefDocumentRefusal(invoice)
  const base = {
    enabled,
    refusal,
    confirm: { invoiceNumber: invoice.invoiceNumber, clientName: invoice.clientName, totalAmount: invoice.totalAmount },
  }
  if (!enabled || refusal) return NextResponse.json({ ...base, state: stateOf(invoice), precheck: null }, { headers })

  const key = await loadSefApiKey(prisma, profile.id)
  if (!key.ok || !config) return NextResponse.json({ ...base, enabled: false, state: stateOf(invoice), precheck: null }, { headers })

  // refresh=1: "Osveži status" (always asks SEF). refresh=auto: opening the invoice asks SEF
  // only while the status can still change (Poslato), so final statuses cost no SEF call.
  const refreshParam = request.nextUrl.searchParams.get('refresh')
  const wantsRefresh =
    refreshParam === '1' ||
    (refreshParam === 'auto' && isSefStatusOpen(isSefStatus(invoice.sefStatus) ? invoice.sefStatus : null))
  let refreshError: string | null = null
  if (wantsRefresh && invoice.sefInvoiceId) {
    const result = await getSalesInvoice(config, key.apiKey, invoice.sefInvoiceId)
    if (result.ok) {
      const snapshot = parseSalesInvoice(result.body)
      if (snapshot.status) {
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { sefStatus: fromSefSalesStatus(snapshot.status), sefStatusComment: snapshot.comment, sefStatusCheckedAt: new Date() },
          include: { items: { orderBy: { id: 'asc' } } },
        })
      }
    } else {
      refreshError = sefErrorView(result, { invoiceId: invoice.id, supportEmail: operator.email }).message
    }
  }

  // Before the first send: the same problems as the XML download, plus "is the buyer on SEF?".
  let precheck: { problems: string[]; buyerRegistered: boolean | null } | null = null
  if (!invoice.sefStatus) {
    const xml = await buildInvoiceSefXml(prisma, profile, invoice)
    let buyerRegistered: boolean | null = null
    if (xml.ok && invoice.clientPib) {
      const answer = await checkCompanyRegistered(config, key.apiKey, {
        vatNumber: invoice.clientPib,
        registrationNumber: await buyerRegistrationNumber(prisma, profile.id, invoice.clientPib),
      })
      buyerRegistered = answer.ok ? parseCompanyRegistered(answer.body) : null
    }
    precheck = { problems: xml.ok ? [] : xml.problems, buyerRegistered }
  }

  return NextResponse.json(
    {
      ...base,
      state: stateOf(invoice),
      // Any sent invoice can be refreshed by hand; the page refreshes open ones (Poslato) on its own.
      refreshable: Boolean(invoice.sefInvoiceId),
      autoRefresh: Boolean(invoice.sefInvoiceId) && isSefStatusOpen(isSefStatus(invoice.sefStatus) ? invoice.sefStatus : null),
      refreshError,
      precheck,
    },
    { headers }
  )
}

/** "Pošalji u SEF". Sends at most once per invoice (src/lib/sef-send.ts). */
export async function POST(request: NextRequest, context: Context) {
  const limited = await enforceRateLimit(request, rateLimits.sefSend)
  if (limited) return limited
  const loaded = await load(context)
  if (loaded.error) return loaded.error
  const { profile, invoice } = loaded
  const expired = accessExpiredResponse(profile)
  if (expired) return expired

  if (!sendSchema.safeParse(await request.json().catch(() => null)).success) {
    return NextResponse.json({ error: 'Potvrdite slanje u SEF.' }, { status: 400, headers })
  }
  const refusal = sefDocumentRefusal(invoice)
  if (refusal) return NextResponse.json({ error: refusal }, { status: 409, headers })

  const config = sefConfig()
  if (!sefSendingAllowed(profile.id)) {
    return NextResponse.json({ error: 'Slanje u SEF trenutno nije dostupno. Koristite XML za SEF.' }, { status: 409, headers })
  }
  const key = await loadSefApiKey(prisma, profile.id)
  if (!config || !key.ok) {
    return NextResponse.json({ error: 'Unesite SEF API ključ u Podešavanjima.', fix: { href: '/settings', label: 'Otvori Podešavanja' } }, { status: 409, headers })
  }

  const xml = await buildInvoiceSefXml(prisma, profile, invoice)
  if (!xml.ok) {
    return NextResponse.json({ error: 'Za slanje u SEF nedostaju podaci.', problems: xml.problems }, { status: 422, headers })
  }

  const outcome = await sendInvoiceToSef({
    store: prismaSefSendStore(prisma, invoice.id, profile.id),
    send: (requestId) => sendSalesInvoiceUbl(config, key.apiKey, { xml: xml.xml, requestId }),
    errorContext: { invoiceId: invoice.id, supportEmail: operator.email },
  })

  const fresh = await prisma.invoice.findFirstOrThrow({ where: { id: invoice.id, profileId: profile.id } })
  switch (outcome.kind) {
    case 'sent':
      return NextResponse.json({ state: stateOf(fresh), message: 'Faktura je poslata u SEF.' }, { headers })
    case 'already-sent':
      return NextResponse.json({ state: stateOf(fresh), message: 'Faktura je već poslata u SEF.' }, { headers })
    case 'in-progress':
      return NextResponse.json({ state: stateOf(fresh), error: 'Slanje je već u toku. Sačekajte minut.' }, { status: 409, headers })
    case 'uncertain':
      return NextResponse.json({ state: stateOf(fresh), error: outcome.error.message }, { status: 202, headers })
    case 'refused':
      return NextResponse.json(
        { state: stateOf(fresh), error: outcome.error.message, fix: outcome.error.fix, code: outcome.error.code },
        { status: 422, headers }
      )
  }
}
