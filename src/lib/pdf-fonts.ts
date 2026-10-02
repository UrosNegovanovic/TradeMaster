import { Font } from '@react-pdf/renderer'

/**
 * PDF font with full Serbian Latin and Cyrillic coverage.
 * The built-in Helvetica drops č, ć, đ, Č, Ć and Đ ("Đorđević" prints as "ore vi").
 * Liberation Sans (SIL OFL, public/fonts/LICENSE-LiberationSans.txt) has Helvetica's metrics, so layouts do not move.
 */
export const PDF_FONT_FAMILY = 'LiberationSans'

const FONT_FILES = [
  { file: 'LiberationSans-Regular.ttf' },
  { file: 'LiberationSans-Bold.ttf', fontWeight: 'bold' as const },
  { file: 'LiberationSans-Italic.ttf', fontStyle: 'italic' as const },
]

export function pdfFontSources(origin: string) {
  const base = origin.replace(/\/+$/, '')
  return FONT_FILES.map(({ file, ...style }) => ({ src: `${base}/fonts/${file}`, ...style }))
}

let registered = false

/** Registers the PDF font once. Call at module load of client-only PDF components. */
export function registerPdfFonts(origin = typeof window !== 'undefined' ? window.location.origin : '') {
  if (registered) return
  Font.register({ family: PDF_FONT_FAMILY, fonts: pdfFontSources(origin) })
  registered = true
}
