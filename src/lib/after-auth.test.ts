import { afterEach, describe, expect, it, vi } from 'vitest'
import { AFTER_AUTH_PATH, afterAuthPathForUser } from './after-auth'

describe('afterAuthPathForUser', () => {
  it('sends a signed-in user to the dashboard, not the marketing home', () => {
    expect(afterAuthPathForUser('user_123')).toBe(AFTER_AUTH_PATH)
    expect(AFTER_AUTH_PATH).toBe('/dashboard')
  })

  it('leaves unsigned visitors on the public home', () => {
    expect(afterAuthPathForUser(null)).toBeNull()
    expect(afterAuthPathForUser(undefined)).toBeNull()
    expect(afterAuthPathForUser('')).toBeNull()
  })

  describe('platform owner (ROADMAP O1)', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('sends the owner to the owner panel and everyone else to the dashboard', () => {
      vi.stubEnv('OWNER_PANEL', 'on')
      vi.stubEnv('PLATFORM_OWNER_USER_IDS', 'user_owner')
      expect(afterAuthPathForUser('user_owner')).toBe('/owner')
      expect(afterAuthPathForUser('user_123')).toBe(AFTER_AUTH_PATH)
      expect(afterAuthPathForUser(null)).toBeNull()
    })

    it('keeps the owner on the dashboard while the panel is off', () => {
      vi.stubEnv('OWNER_PANEL', '')
      vi.stubEnv('PLATFORM_OWNER_USER_IDS', 'user_owner')
      expect(afterAuthPathForUser('user_owner')).toBe(AFTER_AUTH_PATH)
    })
  })
})
