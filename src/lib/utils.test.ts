import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  describe('merge behavior', () => {
    it('merges multiple class strings', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes via clsx', () => {
      expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
    })

    it('handles arrays of classes', () => {
      expect(cn(['a', 'b'], 'c')).toBe('a b c')
    })

    it('handles objects (clsx conditional object syntax)', () => {
      expect(cn({ active: true, disabled: false })).toBe('active')
    })
  })

  describe('override behavior (tailwind-merge)', () => {
    it('overrides conflicting padding classes (last wins)', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
    })

    it('overrides conflicting margin classes', () => {
      expect(cn('m-4', 'm-2')).toBe('m-2')
    })

    it('overrides conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('keeps non-conflicting Tailwind classes', () => {
      expect(cn('p-4', 'm-2', 'text-sm')).toBe('p-4 m-2 text-sm')
    })
  })
})
