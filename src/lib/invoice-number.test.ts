import { describe, expect, it } from 'vitest'
import { nextInvoiceNumber, reserveNextInvoiceNumber } from './invoice-number'

describe('nextInvoiceNumber', () => {
  it('starts a company year at 01/YYYY when there are no existing invoices', () => {
    expect(nextInvoiceNumber(2026, [])).toBe('01/2026')
  })

  it('continues the existing NN/YYYY sequence instead of resetting it', () => {
    expect(nextInvoiceNumber(2026, ['01/2026', '02/2026', '04/2026', '06/2026'])).toBe('07/2026')
  })

  it('ignores malformed or legacy labels that do not match NN/YYYY', () => {
    expect(nextInvoiceNumber(2026, ['02/2026', 'Test2026-11', '999/2025', '10/2026'])).toBe(
      '11/2026'
    )
  })

  it('scopes the sequence to the given year and ignores other years', () => {
    expect(nextInvoiceNumber(2026, ['05/2025', '99/2025'])).toBe('01/2026')
  })
})

describe('reserveNextInvoiceNumber', () => {
  function fakeTx(existing: string[]) {
    const where: Array<{ endsWith: string }> = []
    return {
      where,
      tx: {
        $executeRaw: async () => 1,
        invoice: {
          findMany: async (args: { where: { invoiceNumber: { endsWith: string } } }) => {
            where.push(args.where.invoiceNumber)
            return existing.filter((n) => n.endsWith(args.where.invoiceNumber.endsWith)).map((invoiceNumber) => ({ invoiceNumber }))
          },
        },
      },
    }
  }

  it('uses the Belgrade year just after midnight on 1 Jan, while UTC is still the old year', async () => {
    const { tx, where } = fakeTx(['07/2026', '01/2027'])
    // 31 Dec 23:30 UTC = 1 Jan 00:30 in Belgrade
    const number = await reserveNextInvoiceNumber(tx as never, 'profile-a', new Date('2026-12-31T23:30:00.000Z'))
    expect(where[0].endsWith).toBe('/2027')
    expect(number).toBe('02/2027')
  })

  it('keeps the old year until Belgrade midnight', async () => {
    const { tx } = fakeTx(['07/2026'])
    const number = await reserveNextInvoiceNumber(tx as never, 'profile-a', new Date('2026-12-31T22:30:00.000Z'))
    expect(number).toBe('08/2026')
  })
})
