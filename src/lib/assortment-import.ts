import { optionalCostPriceSchema } from '@/lib/validations'

export const ASSORTMENT_HEADERS = ['naziv', 'sku', 'kolicina', 'cena', 'nabavna_cena', 'kategorija'] as const
export const STOCK_ADJUST_HEADERS = ['sku', 'kolicina'] as const

export const ASSORTMENT_TEMPLATE_CSV = `${ASSORTMENT_HEADERS.join(',')}\n`
export const STOCK_ADJUST_TEMPLATE_CSV = `${STOCK_ADJUST_HEADERS.join(',')}\n`

export type AssortmentPayload = {
  name: string
  sku: string
  quantity: number
  price: number
  costPrice?: number
  categoryName?: string
}

export type StockAdjustPayload = {
  sku: string
  quantity: number
}

export type PreviewIssue = {
  field?: string
  message: string
}

export type AssortmentPreviewRow = {
  line: number
  valid: boolean
  issues: PreviewIssue[]
  display: {
    naziv: string
    sku: string
    kolicina: string
    cena: string
    nabavna_cena: string
    kategorija: string
  }
  payload?: AssortmentPayload
}

export type StockAdjustPreviewRow = {
  line: number
  valid: boolean
  issues: PreviewIssue[]
  display: {
    sku: string
    kolicina: string
  }
  payload?: StockAdjustPayload
}

export function cellText(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

export function parseCsvText(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (ch === '\r') continue
    cell += ch
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = cellText(value).replace(/\s/g, '').replace(',', '.')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function isEmptyRow(row: unknown[] | undefined): boolean {
  if (!row || row.length === 0) return true
  return row.every((value) => cellText(value) === '')
}

function headersMatch(row: unknown[], expected: readonly string[]): boolean {
  if (row.length < expected.length) return false
  return expected.every((name, index) => cellText(row[index]).toLowerCase() === name)
}

function firstNonEmptyRowIndex(rows: unknown[][]): number {
  return rows.findIndex((row) => !isEmptyRow(row))
}

export type GridParseError = {
  error: string
}

function costPriceFromCell(value: unknown): { value?: number; error?: string } {
  if (cellText(value) === '') return {}
  const parsed = parseNumber(value)
  if (parsed == null) return { error: 'Nabavna cena mora biti broj' }
  const result = optionalCostPriceSchema.safeParse(parsed)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Nabavna cena mora biti broj' }
  }
  if (result.data == null) return {}
  if (result.data === 0) {
    return { error: 'Nabavna cena 0 zahteva razlog — unesite ga u formi proizvoda, ne u CSV-u' }
  }
  return { value: result.data }
}

export function parseAssortmentGrid(rows: unknown[][]): GridParseError | { rows: AssortmentPreviewRow[] } {
  const headerIndex = firstNonEmptyRowIndex(rows)
  if (headerIndex < 0) {
    return { error: 'Fajl je prazan. Očekivane kolone: naziv,sku,kolicina,cena,nabavna_cena,kategorija' }
  }
  if (!headersMatch(rows[headerIndex], ASSORTMENT_HEADERS)) {
    return {
      error:
        'Zaglavlje mora tačno biti: naziv,sku,kolicina,cena,nabavna_cena,kategorija (bez mapiranja drugih naziva kolona).',
    }
  }

  const preview: AssortmentPreviewRow[] = []
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index]
    if (isEmptyRow(row)) continue
    const line = index + 1
    const naziv = cellText(row[0])
    const sku = cellText(row[1])
    const kolicinaText = cellText(row[2])
    const cenaText = cellText(row[3])
    const nabavnaText = cellText(row[4])
    const kategorija = cellText(row[5])
    const issues: PreviewIssue[] = []

    if (!naziv) issues.push({ field: 'naziv', message: 'Naziv je obavezan' })
    if (!sku) issues.push({ field: 'sku', message: 'SKU je obavezan' })

    const quantity = parseNumber(row[2])
    if (kolicinaText === '' || quantity == null) {
      issues.push({ field: 'kolicina', message: 'Količina mora biti broj' })
    } else if (!Number.isInteger(quantity) || quantity < 1) {
      issues.push({ field: 'kolicina', message: 'Količina mora biti ceo broj veći od 0' })
    }

    const price = parseNumber(row[3])
    if (cenaText === '' || price == null) {
      issues.push({ field: 'cena', message: 'Cena mora biti broj' })
    } else if (price < 0) {
      issues.push({ field: 'cena', message: 'Cena ne može biti negativna' })
    }

    const cost = costPriceFromCell(row[4])
    if (cost.error) issues.push({ field: 'nabavna_cena', message: cost.error })

    const valid = issues.length === 0
    const payload: AssortmentPayload | undefined = valid
      ? {
          name: naziv,
          sku,
          quantity: quantity as number,
          price: price as number,
          ...(cost.value !== undefined ? { costPrice: cost.value } : {}),
          ...(kategorija ? { categoryName: kategorija } : {}),
        }
      : undefined

    preview.push({
      line,
      valid,
      issues,
      display: {
        naziv,
        sku,
        kolicina: kolicinaText,
        cena: cenaText,
        nabavna_cena: nabavnaText,
        kategorija,
      },
      payload,
    })
  }

  if (preview.length === 0) {
    return { error: 'Nema redova za uvoz ispod zaglavlja.' }
  }

  return { rows: preview }
}

export function parseStockAdjustGrid(rows: unknown[][]): GridParseError | { rows: StockAdjustPreviewRow[] } {
  const headerIndex = firstNonEmptyRowIndex(rows)
  if (headerIndex < 0) {
    return { error: 'Fajl je prazan. Očekivane kolone: sku,kolicina' }
  }
  if (!headersMatch(rows[headerIndex], STOCK_ADJUST_HEADERS)) {
    return {
      error: 'Zaglavlje mora tačno biti: sku,kolicina. Cena i nabavna cena se ne menjaju ovim uvozom.',
    }
  }

  const preview: StockAdjustPreviewRow[] = []
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index]
    if (isEmptyRow(row)) continue
    const line = index + 1
    const sku = cellText(row[0])
    const kolicinaText = cellText(row[1])
    const issues: PreviewIssue[] = []

    if (!sku) issues.push({ field: 'sku', message: 'SKU je obavezan' })

    const quantity = parseNumber(row[1])
    if (kolicinaText === '' || quantity == null) {
      issues.push({ field: 'kolicina', message: 'Količina mora biti broj' })
    } else if (!Number.isInteger(quantity) || quantity < 0) {
      issues.push({ field: 'kolicina', message: 'Količina mora biti ceo broj 0 ili veći' })
    }

    const valid = issues.length === 0
    preview.push({
      line,
      valid,
      issues,
      display: { sku, kolicina: kolicinaText },
      payload: valid ? { sku, quantity: quantity as number } : undefined,
    })
  }

  if (preview.length === 0) {
    return { error: 'Nema redova za uvoz ispod zaglavlja.' }
  }

  return { rows: preview }
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function readSpreadsheetRows(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase()
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain'
  if (isCsv) {
    return parseCsvText(await file.text())
  }

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][]
}
