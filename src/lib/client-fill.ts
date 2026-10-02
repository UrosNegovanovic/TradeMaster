import type { Client } from '@/types/client'

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
