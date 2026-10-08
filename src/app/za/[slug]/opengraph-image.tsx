import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image'
import { tradePages } from '@/lib/trade-pages'
import { tradeOgText } from '@/lib/og-image-text'

export const alt = 'TradeMaster po delatnosti'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const runtime = 'edge'

export function generateStaticParams() {
  return tradePages.map((page) => ({ slug: page.slug }))
}

export default function TradeOpengraphImage({ params }: { params: { slug: string } }) {
  return renderOgImage(tradeOgText(params.slug))
}
