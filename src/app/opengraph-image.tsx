import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image'

export const alt = 'TradeMaster: od barkoda do fakture, sa telefona'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const runtime = 'edge'

export default function OpengraphImage() {
  return renderOgImage({
    eyebrow: 'Za trgovce i malu veleprodaju',
    headline: ['Skenirajte robu.', 'Pošaljite katalog.', 'Izdajte fakturu sa QR kodom.'],
    footer: 'Ceo posao sa robom iz telefona',
  })
}
