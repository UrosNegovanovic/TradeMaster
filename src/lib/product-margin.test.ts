import { describe, expect, it } from 'vitest'
import { formatRsd } from './invoice-finance'
import { productMarginHint } from './product-margin'

describe('productMarginHint (ROADMAP A9.16)', () => {
  it('shows the difference, the margin on the sale price and the markup on the purchase price', () => {
    expect(productMarginHint(120, 80)).toEqual({
      text: `Razlika ${formatRsd(40)} · marža 33,33% · na nabavnu +50%`,
      negative: false,
    })
  })

  it('warns when selling below the purchase price', () => {
    const hint = productMarginHint(90, 100)
    expect(hint?.negative).toBe(true)
    expect(hint?.text).toContain('marža -11,11%')
  })

  it('leaves out the markup for a purchase price of 0', () => {
    expect(productMarginHint(50, 0)?.text).toBe(`Razlika ${formatRsd(50)} · marža 100%`)
  })

  it('stays hidden until both prices are usable', () => {
    expect(productMarginHint(0, 80)).toBeNull()
    expect(productMarginHint(120, undefined)).toBeNull()
    expect(productMarginHint(120, '')).toBeNull()
    expect(productMarginHint(Number.NaN, 80)).toBeNull()
  })
})
