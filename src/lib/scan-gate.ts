/**
 * Minimum time between two counted reads of the same barcode while it stays in frame.
 * Holding a code steady yields one +1 per cooldown; shorter risks one intended scan
 * counting twice, longer makes deliberate repeat scans feel sluggish.
 */
export const SAME_CODE_COOLDOWN_MS = 700

/**
 * A code with no validated reads for this long (and for at least twice the cadence its reads
 * have been arriving at) has left the frame, so re-presenting it counts at once. The cadence
 * factor keeps slow decoders, whose reads are naturally far apart, from looking like exits.
 */
export const FRAME_EXIT_MS = 500

export type ScanGate = {
  /** Record a validated read; returns true when it should count as a new scan. */
  accept: (code: string, now: number) => boolean
  /** Let the next read of `code` count immediately (e.g. after a failed save). */
  release: (code: string) => void
  reset: () => void
}

export function createScanGate(cooldownMs = SAME_CODE_COOLDOWN_MS, frameExitMs = FRAME_EXIT_MS): ScanGate {
  let last: { code: string; acceptedAt: number; seenAt: number; cadence: number | null } | null = null

  return {
    accept(code, now) {
      if (last && last.code === code) {
        const gap = now - last.seenAt
        // Until the cadence is known a gap cannot be told apart from a slow decoder.
        const leftFrame = last.cadence !== null && gap >= Math.max(frameExitMs, 2 * last.cadence)
        if (!leftFrame) last.cadence = gap
        last.seenAt = now
        if (!leftFrame && now - last.acceptedAt < cooldownMs) return false
        last.acceptedAt = now
        return true
      }
      last = { code, acceptedAt: now, seenAt: now, cadence: null }
      return true
    },
    release(code) {
      if (last?.code === code) last = null
    },
    reset() {
      last = null
    },
  }
}
