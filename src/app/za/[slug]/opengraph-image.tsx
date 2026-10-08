import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image'
import { tradePageBySlug, tradePages } from '@/lib/trade-pages'

export const alt = 'TradeMaster po delatnosti'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const runtime = 'edge'

export function generateStaticParams() {
  return tradePages.map((page) => ({ slug: page.slug }))
}

export default function TradeOpengraphImage({ params }: { params: { slug: string } }) {
  const page = tradePageBySlug(params.slug)
  return renderOgImage({
    eyebrow: page?.label ?? 'TradeMaster',
    headline: [page?.h1 ?? 'TradeMaster'],
    footer: 'Lager, katalog, predračun i faktura iz telefona',
  })
}
