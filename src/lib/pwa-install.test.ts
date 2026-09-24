import { describe, expect, it } from 'vitest'
import { isIosDevice, isStandaloneDisplay, resolveInstallClick } from './pwa-install'

describe('pwa-install', () => {
  it('treats standalone display as already on the home screen', () => {
    expect(isStandaloneDisplay({ displayModeStandalone: true })).toBe(true)
    expect(isStandaloneDisplay({ safariStandalone: true })).toBe(true)
    expect(isStandaloneDisplay({})).toBe(false)
  })

  it('detects iPhone and iPad, not desktop Chrome', () => {
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(true)
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', touchMac: true })).toBe(true)
    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36',
      })
    ).toBe(false)
  })

  it('prefers the Chrome install prompt over any menu lecture', () => {
    expect(resolveInstallClick({ installed: false, ios: false, hasPrompt: true })).toBe('prompt')
    expect(resolveInstallClick({ installed: true, ios: false, hasPrompt: true })).toBe('installed')
    expect(resolveInstallClick({ installed: false, ios: true, hasPrompt: false })).toBe('ios-guide')
    expect(resolveInstallClick({ installed: false, ios: false, hasPrompt: false })).toBe('open-chrome')
  })
})
