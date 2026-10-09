import type { Client } from '@/types/client'
import { clientWriteSchema, type ClientWriteInput } from '@/lib/validations'

/** Copies a saved client into the invoice form fields (invoices keep a snapshot, not a link). */
export function clientToInvoiceFields(client: Pick<Client, 'name' | 'pib' | 'address'>) {
  return {
    clientName: client.name,
    clientPib: client.pib ?? '',
    clientAddress: client.address ?? '',
  }
}

/** Saved client whose name matches (case-insensitive, trimmed), used to avoid saving the same buyer twice. */
export function findClientByName<T extends Pick<Client, 'name'>>(clients: readonly T[], name: string): T | undefined {
  const wanted = name.trim().toLowerCase()
  if (!wanted) return undefined
  return clients.find((client) => client.name.trim().toLowerCase() === wanted)
}

type InvoiceBuyer = { clientName: string; clientPib: string; clientAddress: string }

/**
 * Saved client behind an invoice's buyer snapshot: same PIB first (what the SEF XML uses), then same name,
 * so a buyer whose PIB was wrong on the invoice is still found.
 */
export function findSavedClientForInvoice<T extends Pick<Client, 'name' | 'pib'>>(
  clients: readonly T[],
  buyer: Pick<InvoiceBuyer, 'clientName' | 'clientPib'>
): T | undefined {
  const pib = buyer.clientPib.replace(/\D/g, '')
  if (pib) {
    const byPib = clients.find((client) => (client.pib ?? '').replace(/\D/g, '') === pib)
    if (byPib) return byPib
  }
  return findClientByName(clients, buyer.clientName)
}

/** True when filling from the saved client would change the invoice's buyer name, PIB or address. */
export function savedClientDiffers(client: Pick<Client, 'name' | 'pib' | 'address'>, buyer: InvoiceBuyer): boolean {
  const saved = clientToInvoiceFields(client)
  return (
    saved.clientName.trim() !== buyer.clientName.trim() ||
    saved.clientPib.trim() !== buyer.clientPib.trim() ||
    saved.clientAddress.trim() !== buyer.clientAddress.trim()
  )
}

/**
 * "Sačuvaj kupca" on an invoice (ROADMAP A9.12): the saved buyer must pass the same rules as Kupci
 * (PIB control digit, MB with a PIB, address with city), because the SEF XML reads MB from Kupci.
 */
export function newClientFromInvoice(fields: {
  clientName: string
  clientPib: string
  clientAddress: string
  registrationNumber: string
}): { ok: true; data: ClientWriteInput } | { ok: false; message: string } {
  const parsed = clientWriteSchema.safeParse({
    name: fields.clientName,
    pib: fields.clientPib,
    registrationNumber: fields.registrationNumber,
    address: fields.clientAddress,
  })
  if (parsed.success) return { ok: true, data: parsed.data }
  return { ok: false, message: parsed.error.issues[0]?.message ?? 'Podaci kupca nisu ispravni.' }
}

/** Buyer fields for a new invoice/predračun opened from Kupci (?clientId=). */
export function invoicePrefillFromClient(client: Pick<Client, 'name' | 'pib' | 'address'>) {
  return { ...clientToInvoiceFields(client), items: [] }
}
