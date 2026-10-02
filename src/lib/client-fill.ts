import type { Client } from '@/types/client'

/** Copies a saved client into the invoice form fields (invoices keep a snapshot, not a link). */
export function clientToInvoiceFields(client: Pick<Client, 'name' | 'pib' | 'address'>) {
  return {
    clientName: client.name,
    clientPib: client.pib ?? '',
    clientAddress: client.address ?? '',
  }
}
