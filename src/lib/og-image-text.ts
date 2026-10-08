import { tradePageBySlug } from '@/lib/trade-pages'

/** Characters present in the subset fonts. Keep in sync with src/assets/og/README.md. */
export const OG_FONT_CHARS =
  ' !"#$%&()*+,-./0123456789:;?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyzČĆŠŽĐčćšžđ„“”–—→€·\''

/** Words on the link-preview images (ROADMAP A2.11); every character must be in OG_FONT_CHARS. */
export type OgText = { eyebrow: string; headline: string[]; footer: string }

export const homeOgText: OgText = {
  eyebrow: 'Za trgovce i malu veleprodaju',
  headline: ['Skenirajte robu.', 'Pošaljite katalog.', 'Izdajte fakturu sa QR kodom.'],
  footer: 'Ceo posao sa robom iz telefona',
}

export function tradeOgText(slug: string): OgText {
  const page = tradePageBySlug(slug)
  return {
    eyebrow: page?.label ?? 'TradeMaster',
    headline: [page?.h1 ?? 'TradeMaster'],
    footer: 'Lager, katalog, predračun i faktura iz telefona',
  }
}
