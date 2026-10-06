/**
 * Quick Scan success beep (docs/scanner-ux-rules.md, "Single Beep" rule).
 * QuickScanButton plays it only after a save is confirmed, or when a code is identified as not found,
 * never on a raw camera read. The scanner's sound toggle writes the on/off setting here.
 */

type AudioContextLike = Pick<AudioContext, 'state' | 'resume' | 'currentTime' | 'destination' | 'createOscillator' | 'createGain'>

export const SCAN_BEEP_MIN_GAP_MS = 100

export function createScanBeep(
  createContext: () => AudioContextLike | null = defaultAudioContext,
  now: () => number = () => Date.now()
) {
  let context: AudioContextLike | null = null
  let enabled = true
  let lastBeepAt = -Infinity

  const ensureContext = () => {
    if (!context) context = createContext()
    return context
  }

  return {
    setEnabled(value: boolean) {
      enabled = value
    },
    isEnabled() {
      return enabled
    },
    /** Call from a user gesture (tap on "Skeniraj"): iOS only lets audio start after one. */
    unlock() {
      if (!enabled) return
      try {
        ensureContext()?.resume().catch(() => {})
      } catch {
        context = null
      }
    },
    async play(): Promise<boolean> {
      if (!enabled) return false
      const at = now()
      if (at - lastBeepAt < SCAN_BEEP_MIN_GAP_MS) return false
      lastBeepAt = at
      try {
        const audio = ensureContext()
        if (!audio) return false
        if (audio.state === 'suspended') await audio.resume()
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.connect(gain)
        gain.connect(audio.destination)
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gain.gain.setValueAtTime(0.3, audio.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.15)
        oscillator.start(audio.currentTime)
        oscillator.stop(audio.currentTime + 0.15)
        return true
      } catch {
        // Recreate the context on the next beep; sound is best-effort feedback.
        context = null
        return false
      }
    },
  }
}

function defaultAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Ctor ? new Ctor() : null
}

/** One beep per browser tab, shared by the scanner toggle and QuickScanButton. */
export const scanBeep = createScanBeep()
