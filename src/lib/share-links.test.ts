import { describe, expect, it } from 'vitest'
import { buildMessageTargets, buildShareTargets, emailForMailto, phoneForWhatsApp, shareMessage } from './share-links'

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

describe('straight to the buyer (ROADMAP A9.21)', () => {
  it('turns Serbian phone numbers into wa.me digits', () => {
    expect(phoneForWhatsApp('064 123 4567')).toBe('381641234567')
    expect(phoneForWhatsApp('+381 (64) 123-4567')).toBe('381641234567')
    expect(phoneForWhatsApp('00381641234567')).toBe('381641234567')
    expect(phoneForWhatsApp('011/123-456')).toBe('38111123456')
    expect(phoneForWhatsApp('123')).toBeNull()
    expect(phoneForWhatsApp(null)).toBeNull()
  })

  it('accepts only a plausible e-mail', () => {
    expect(emailForMailto(' kupac@firma.rs ')).toBe('kupac@firma.rs')
    expect(emailForMailto('kupac@firma')).toBeNull()
  })

  it('addresses WhatsApp and e-mail to the buyer; Viber stays a forward', () => {
    const targets = buildMessageTargets('Podsetnik', 'Faktura 1/2026', { phone: '064 123 4567', email: 'kupac@firma.rs' })
    expect(targets.whatsapp).toBe('https://wa.me/381641234567?text=Podsetnik')
    expect(targets.email.startsWith('mailto:kupac%40firma.rs?subject=')).toBe(true)
    expect(targets.viber).toBe('viber://forward?text=Podsetnik')
  })

  it('keeps the old picker links without a usable contact', () => {
    expect(buildMessageTargets('x', 'y', { phone: 'n/a' }).whatsapp).toBe('https://wa.me/?text=x')
    expect(buildMessageTargets('x', 'y').email.startsWith('mailto:?subject=')).toBe(true)
  })
})
