import { describe, expect, it } from 'vitest'
import { buildShareTargets, shareMessage } from './share-links'

const url = 'https://app.example.rs/shared/invoice/' + 'a'.repeat(64)

describe('shareMessage', () => {
  it('puts the link on its own line after the text', () => {
    expect(shareMessage('Faktura 2026-001', url)).toBe(`Faktura 2026-001\n${url}`)
  })

  it('falls back to the bare link', () => {
    expect(shareMessage('  ', url)).toBe(url)
  })
})

describe('buildShareTargets', () => {
  const targets = buildShareTargets({ url, text: 'Faktura 2026-001 – Firma & Sin', subject: 'Faktura 2026-001' })

  it('prefills WhatsApp with the encoded message', () => {
    expect(targets.whatsapp.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(targets.whatsapp.split('text=')[1])).toBe(`Faktura 2026-001 – Firma & Sin\n${url}`)
  })

  it('prefills Viber forward', () => {
    expect(targets.viber.startsWith('viber://forward?text=')).toBe(true)
    expect(decodeURIComponent(targets.viber.split('text=')[1])).toContain(url)
  })

  it('encodes the e-mail subject and body so & does not split the query', () => {
    const query = new URLSearchParams(targets.email.slice('mailto:?'.length))
    expect(query.get('subject')).toBe('Faktura 2026-001')
    expect(query.get('body')).toBe(`Faktura 2026-001 – Firma & Sin\n${url}`)
  })
})
