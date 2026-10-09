import { describe, expect, it } from 'vitest'
import { sefSendingAllowed } from './sef-access'

const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv

describe('sefSendingAllowed', () => {
  it('is off for everyone when nothing is set', () => {
    expect(sefSendingAllowed('profile-a', env({}))).toBe(false)
  })

  it('is on for every company with SEF_SENDING=on', () => {
    expect(sefSendingAllowed('profile-a', env({ SEF_SENDING: 'on' }))).toBe(true)
    expect(sefSendingAllowed('profile-a', env({ SEF_SENDING: ' ON ' }))).toBe(true)
  })

  it('is on only for the listed test companies otherwise', () => {
    const listed = env({ SEF_SENDING_PROFILES: ' profile-a , profile-b,' })
    expect(sefSendingAllowed('profile-a', listed)).toBe(true)
    expect(sefSendingAllowed('profile-b', listed)).toBe(true)
    expect(sefSendingAllowed('profile-c', listed)).toBe(false)
    expect(sefSendingAllowed('profile-a', env({ SEF_SENDING: 'off', SEF_SENDING_PROFILES: 'profile-b' }))).toBe(false)
  })
})
