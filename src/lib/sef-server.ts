import type { PrismaClient } from '@prisma/client'
import { decryptSefApiKey, encryptSefApiKey, readMasterKey, SefKeyCryptoError } from '@/lib/sef-key-crypto'
import type { SefSendStore } from '@/lib/sef-send'

/**
 * Server-side SEF storage (ROADMAP A3): the encrypted API key and the send-state store.
 * Nothing here returns the key to a client; callers pass it straight to sef-client.
 */
type Db = Pick<PrismaClient, 'sefCredential' | 'invoice'>

export type SefKeyLoad =
  | { ok: true; apiKey: string }
  | { ok: false; reason: 'not-configured' | 'no-key' | 'unreadable' }

/** SEF sending exists only when the server has a master key. */
export function sefEncryptionAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return readMasterKey(env) !== null
}

export async function hasSefApiKey(db: Db, profileId: string): Promise<boolean> {
  const row = await db.sefCredential.findUnique({ where: { profileId }, select: { profileId: true } })
  return Boolean(row)
}

export async function loadSefApiKey(db: Db, profileId: string): Promise<SefKeyLoad> {
  const master = readMasterKey()
  if (!master) return { ok: false, reason: 'not-configured' }
  const row = await db.sefCredential.findUnique({ where: { profileId }, select: { apiKeyCiphertext: true } })
  if (!row) return { ok: false, reason: 'no-key' }
  try {
    return { ok: true, apiKey: decryptSefApiKey(row.apiKeyCiphertext, profileId, master) }
  } catch (error) {
    if (error instanceof SefKeyCryptoError) return { ok: false, reason: 'unreadable' }
    throw error
  }
}

export async function saveSefApiKey(db: Db, profileId: string, apiKey: string): Promise<boolean> {
  const master = readMasterKey()
  if (!master) return false
  const apiKeyCiphertext = encryptSefApiKey(apiKey, profileId, master)
  await db.sefCredential.upsert({
    where: { profileId },
    create: { profileId, apiKeyCiphertext },
    update: { apiKeyCiphertext },
  })
  return true
}

export async function deleteSefApiKey(db: Db, profileId: string): Promise<void> {
  await db.sefCredential.deleteMany({ where: { profileId } })
}

/** SefSendStore on Prisma: every write is a conditional updateMany, so concurrent sends cannot both win. */
export function prismaSefSendStore(db: Db, invoiceId: string, profileId: string): SefSendStore {
  const where = { id: invoiceId, profileId }
  return {
    async claim(requestId, now) {
      const result = await db.invoice.updateMany({
        where: { ...where, documentType: 'INVOICE', status: { not: 'DRAFT' }, sefStatus: null },
        data: { sefStatus: 'SENDING', sefRequestId: requestId, sefSentAt: now, sefLastError: null },
      })
      return result.count === 1
    },
    async reclaimStale(requestId, staleBefore, now) {
      const result = await db.invoice.updateMany({
        where: { ...where, sefStatus: 'SENDING', sefRequestId: requestId, sefSentAt: { lt: staleBefore } },
        data: { sefSentAt: now },
      })
      return result.count === 1
    },
    async read() {
      const invoice = await db.invoice.findFirstOrThrow({
        where,
        select: { sefStatus: true, sefRequestId: true, sefSentAt: true, sefInvoiceId: true },
      })
      return invoice
    },
    async markSent(requestId, sefInvoiceId, now) {
      await db.invoice.updateMany({
        where: { ...where, sefRequestId: requestId },
        data: { sefStatus: 'SENT', sefInvoiceId, sefStatusCheckedAt: now, sefLastError: null },
      })
    },
    async markUncertain(requestId, message) {
      await db.invoice.updateMany({ where: { ...where, sefRequestId: requestId }, data: { sefLastError: message } })
    },
    async release(requestId, message) {
      await db.invoice.updateMany({
        where: { ...where, sefRequestId: requestId, sefStatus: 'SENDING' },
        data: { sefStatus: null, sefRequestId: null, sefSentAt: null, sefLastError: message },
      })
    },
  }
}
