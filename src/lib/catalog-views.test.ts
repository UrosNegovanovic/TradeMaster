import { describe, expect, it } from 'vitest'

import { formatCatalogViews } from './catalog-views'

describe('formatCatalogViews', () => {
  it('says nobody opened the link yet', () => {
    expect(formatCatalogViews(0, null)).toBe('Link još niko nije otvorio.')
  })

  it('uses "put" for 1 and 21, "puta" otherwise, with the last open in Belgrade time', () => {
    expect(formatCatalogViews(1, '2026-10-07T12:05:00.000Z')).toMatch(/^Link je otvoren 1 put, poslednji put 07\.10\.2026\.? u 14:05\.$/)
    expect(formatCatalogViews(21, null)).toBe('Link je otvoren 21 put.')
    expect(formatCatalogViews(11, null)).toBe('Link je otvoren 11 puta.')
    expect(formatCatalogViews(3, null)).toBe('Link je otvoren 3 puta.')
  })
})
