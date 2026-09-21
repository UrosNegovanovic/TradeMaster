import { describe, expect, it } from 'vitest'
import { commitDraftNumber, isDraftNumberInput, parseDraftNumber } from './draft-number'

describe('isDraftNumberInput', () => {
  it('allows empty and integer digits', () => {
    expect(isDraftNumberInput('', 'integer')).toBe(true)
    expect(isDraftNumberInput('12', 'integer')).toBe(true)
    expect(isDraftNumberInput('1.5', 'integer')).toBe(false)
    expect(isDraftNumberInput('-1', 'integer')).toBe(false)
  })

  it('allows decimal drafts with comma or trailing separator', () => {
    expect(isDraftNumberInput('10', 'decimal')).toBe(true)
    expect(isDraftNumberInput('10.', 'decimal')).toBe(true)
    expect(isDraftNumberInput('10,5', 'decimal')).toBe(true)
    expect(isDraftNumberInput('10.50', 'decimal')).toBe(true)
    expect(isDraftNumberInput('abc', 'decimal')).toBe(false)
  })
})

describe('parseDraftNumber', () => {
  it('returns null for empty or incomplete drafts', () => {
    expect(parseDraftNumber('', 'integer')).toBeNull()
    expect(parseDraftNumber('.', 'decimal')).toBeNull()
    expect(parseDraftNumber('  ', 'decimal')).toBeNull()
  })

  it('parses Serbian comma decimals', () => {
    expect(parseDraftNumber('10,5', 'decimal')).toBe(10.5)
  })
})

describe('commitDraftNumber', () => {
  it('restores quantity 1 only on blur, not while the field is empty', () => {
    expect(commitDraftNumber('', { kind: 'integer', emptyAs: 1, min: 1 })).toBe(1)
    expect(parseDraftNumber('', 'integer')).toBeNull()
  })

  it('restores discount 0 only on blur so 0 can be replaced', () => {
    expect(commitDraftNumber('', { kind: 'decimal', emptyAs: 0, min: 0, max: 100 })).toBe(0)
    expect(commitDraftNumber('10', { kind: 'decimal', emptyAs: 0, min: 0, max: 100 })).toBe(10)
    expect(commitDraftNumber('150', { kind: 'decimal', emptyAs: 0, min: 0, max: 100 })).toBe(100)
  })
})
