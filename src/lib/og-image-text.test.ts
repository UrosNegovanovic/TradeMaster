import { describe, expect, it } from 'vitest'
import { OG_FONT_CHARS, homeOgText, tradeOgText, type OgText } from './og-image-text'
import { tradePages } from './trade-pages'

const missing = (text: OgText) =>
  [...new Set([...[text.eyebrow, ...text.headline, text.footer, 'TradeMaster'].join('')])].filter(
    (char) => !OG_FONT_CHARS.includes(char)
  )

describe('OG image text fits the subset fonts', () => {
  it('home image', () => {
    expect(missing(homeOgText)).toEqual([])
  })

  it('every trade page image', () => {
    for (const page of tradePages) expect(missing(tradeOgText(page.slug))).toEqual([])
  })
})
