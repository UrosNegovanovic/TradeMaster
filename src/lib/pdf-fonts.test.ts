import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { pdfFontSources } from './pdf-fonts'

describe('pdfFontSources', () => {
  it('builds absolute font URLs for regular, bold and italic', () => {
    expect(pdfFontSources('https://app.example/')).toEqual([
      { src: 'https://app.example/fonts/LiberationSans-Regular.ttf' },
      { src: 'https://app.example/fonts/LiberationSans-Bold.ttf', fontWeight: 'bold' },
      { src: 'https://app.example/fonts/LiberationSans-Italic.ttf', fontStyle: 'italic' },
    ])
  })

  it('points at font files that ship in public/fonts', () => {
    for (const { src } of pdfFontSources('')) {
      expect(existsSync(path.join(process.cwd(), 'public', src))).toBe(true)
    }
  })
})
