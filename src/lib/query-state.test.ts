import { describe, expect, it } from 'vitest'
import { failedBeforeFirstLoad } from './query-state'

describe('failedBeforeFirstLoad', () => {
  it('is true only when the first load failed', () => {
    expect(failedBeforeFirstLoad({ isError: true, dataUpdatedAt: 0 })).toBe(true)
    expect(failedBeforeFirstLoad({ isError: true, dataUpdatedAt: 1_700_000_000_000 })).toBe(false)
    expect(failedBeforeFirstLoad({ isError: false, dataUpdatedAt: 0 })).toBe(false)
  })
})
