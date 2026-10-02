export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallClickKind = 'installed' | 'prompt' | 'ios-guide' | 'android-menu' | 'open-chrome'

export function isStandaloneDisplay(input: {
  displayModeStandalone?: boolean
  safariStandalone?: boolean
}): boolean {
  return input.displayModeStandalone === true || input.safariStandalone === true
}

export function isIosDevice(input: {
  userAgent: string
  touchMac?: boolean
  hasMsStream?: boolean
}): boolean {
  const ios = /iPad|iPhone|iPod/.test(input.userAgent)
  return (ios || input.touchMac === true) && input.hasMsStream !== true
}

export function isAndroidDevice(userAgent: string): boolean {
  return /Android/i.test(userAgent)
}

/**
 * Chrome on Android installs a real app (WebAPK) only through its install prompt or the menu item
 * "Instaliraj aplikaciju". The older "Dodaj na početni ekran" menu item can create just a shortcut,
 * so the label users see on the button depends on the platform.
 */
export function installButtonLabel(ios: boolean): string {
  return ios ? 'Dodaj na početni ekran' : 'Instaliraj aplikaciju'
}

export function resolveInstallClick(input: {
  installed: boolean
  ios: boolean
  android?: boolean
  hasPrompt: boolean
}): InstallClickKind {
  if (input.installed) return 'installed'
  if (input.hasPrompt) return 'prompt'
  if (input.ios) return 'ios-guide'
  if (input.android) return 'android-menu'
  return 'open-chrome'
}

export function takeCapturedInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null
  const captured = window.__tmInstallPrompt
  if (!captured) return null
  window.__tmInstallPrompt = undefined
  return captured
}

declare global {
  interface Window {
    __tmInstallPrompt?: BeforeInstallPromptEvent
  }
}
