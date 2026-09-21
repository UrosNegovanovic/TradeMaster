export type DraftNumberKind = 'integer' | 'decimal'

export function isDraftNumberInput(raw: string, kind: DraftNumberKind): boolean {
  if (raw === '') return true
  if (kind === 'integer') return /^\d+$/.test(raw)
  return /^\d+([.,]\d*)?$/.test(raw)
}

export function parseDraftNumber(raw: string, kind: DraftNumberKind): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '' || normalized === '.') return null
  const value = kind === 'integer' ? Number.parseInt(normalized, 10) : Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : null
}

export function commitDraftNumber(
  raw: string,
  options: {
    kind: DraftNumberKind
    emptyAs: number
    min?: number
    max?: number
  }
): number {
  const parsed = parseDraftNumber(raw, options.kind)
  let value = parsed === null ? options.emptyAs : parsed
  if (options.min != null) value = Math.max(options.min, value)
  if (options.max != null) value = Math.min(options.max, value)
  if (options.kind === 'integer') value = Math.trunc(value)
  return value
}
