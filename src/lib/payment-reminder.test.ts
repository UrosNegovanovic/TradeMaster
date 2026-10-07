import { describe, expect, it } from 'vitest'
import { paymentReminderMessage, paymentReminderSubject } from './payment-reminder'
import { buildMessageTargets } from './share-links'

const url = 'https://app.example.rs/shared/invoice/' + 'a'.repeat(64)

describe('paymentReminderMessage', () => {
  const base = { invoiceNumber: '12/2026', amount: '15000.50', dueDate: '2026-09-30T00:00:00.000Z' }

  it('names the invoice, amount, due date, link and sender', () => {
    const message = paymentReminderMessage({ ...base, companyName: ' Firma d.o.o. ', url })
    expect(message).toContain('faktura 12/2026')
    expect(message).toMatch(/15\.000,50/)
    expect(message).toContain('30.09.2026')
    expect(message).toContain(`QR kodom za plaćanje možete otvoriti ovde: ${url}`)
    expect(message.split('\n').at(-1)).toBe('Firma d.o.o.')
  })

  it('leaves out the link line and empty sender', () => {
    const message = paymentReminderMessage({ ...base, companyName: '  ', url: null })
    expect(message).not.toContain('http')
    expect(message).not.toContain('QR')
    expect(message.split('\n').at(-1)).toBe('Ako ste već platili, zanemarite ovu poruku. Hvala!')
  })

  it('goes into WhatsApp and Viber unchanged', () => {
    const message = paymentReminderMessage({ ...base, url })
    const targets = buildMessageTargets(message, paymentReminderSubject('12/2026'))
    expect(decodeURIComponent(targets.whatsapp.split('text=')[1])).toBe(message)
    expect(decodeURIComponent(targets.viber.split('text=')[1])).toBe(message)
  })
})
