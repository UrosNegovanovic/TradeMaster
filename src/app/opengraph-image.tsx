import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image'
import { homeOgText } from '@/lib/og-image-text'

export const alt = 'TradeMaster: od barkoda do fakture, sa telefona'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const runtime = 'edge'

export default function OpengraphImage() {
  return renderOgImage(homeOgText)
}
