import { describe, expect, it } from 'vitest'
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
})
