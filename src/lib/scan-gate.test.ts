import { describe, expect, it } from 'vitest'
import { createScanGate, FRAME_EXIT_MS, SAME_CODE_COOLDOWN_MS } from './scan-gate'

const CODE = '5901234123457'
// The scanner emits a 2-frame-validated read about every 200ms while a code is visible.
const VALIDATED_READ_INTERVAL_MS = 200

/** Feed validated reads at `times` and return the times that counted. */
function counted(times: number[], code = CODE, gate = createScanGate()) {
  return times.filter((t) => gate.accept(code, t))
}

const every = (from: number, to: number, step = VALIDATED_READ_INTERVAL_MS) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

describe('scan gate', () => {
  it('keeps the cooldown within the tuned 600–900ms band', () => {
    expect(SAME_CODE_COOLDOWN_MS).toBeGreaterThanOrEqual(600)
    expect(SAME_CODE_COOLDOWN_MS).toBeLessThanOrEqual(900)
    expect(FRAME_EXIT_MS).toBeGreaterThan(2 * VALIDATED_READ_INTERVAL_MS)
  })

  it('counts one brief intended scan exactly once', () => {
    // Code in frame for 600ms: four validated reads.
    expect(counted(every(0, 600))).toEqual([0])
  })

  it('repeats a steadily held code once per cooldown, without waiting on anything else', () => {
    const hits = counted(every(0, 3000))
    expect(hits).toEqual([0, 800, 1600, 2400])
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i] - hits[i - 1]).toBeGreaterThanOrEqual(SAME_CODE_COOLDOWN_MS)
      expect(hits[i] - hits[i - 1]).toBeLessThan(SAME_CODE_COOLDOWN_MS + VALIDATED_READ_INTERVAL_MS)
    }
  })

  it('never double-counts when the detector flickers while the code stays in frame', () => {
    // One validated read dropped every so often (gaps of 400ms < FRAME_EXIT_MS).
    const flickering = every(0, 700).filter((t) => t !== 200 && t !== 600)
    expect(counted(flickering)).toEqual([0])
  })

  it('counts again as soon as the code leaves the frame and comes back', () => {
    // A longer cooldown makes the frame-exit path observable on its own.
    const gate = createScanGate(900, FRAME_EXIT_MS)
    const backAt = 200 + FRAME_EXIT_MS
    expect(counted([0, 200, backAt, backAt + 200], CODE, gate)).toEqual([0, backAt])
  })

  it('does not treat a slow decoder cadence as the code leaving the frame', () => {
    // Validated reads 600ms apart: every gap exceeds FRAME_EXIT_MS, yet the code never left.
    const hits = counted(every(0, 3000, 600))
    expect(hits).toEqual([0, 1200, 2400])
  })

  it('does not count a quick second read before the read cadence is known', () => {
    expect(counted([0, FRAME_EXIT_MS])).toEqual([0])
  })

  it('counts a different code immediately and restarts the cooldown per code', () => {
    const gate = createScanGate()
    expect(gate.accept('A', 0)).toBe(true)
    expect(gate.accept('B', 100)).toBe(true)
    expect(gate.accept('B', 300)).toBe(false)
    expect(gate.accept('A', 400)).toBe(true)
  })

  it('release lets the same code count immediately after a failed save', () => {
    const gate = createScanGate()
    expect(gate.accept(CODE, 0)).toBe(true)
    expect(gate.accept(CODE, 100)).toBe(false)
    gate.release(CODE)
    expect(gate.accept(CODE, 150)).toBe(true)
  })

  it('reset clears state when the scanner closes', () => {
    const gate = createScanGate()
    gate.accept(CODE, 0)
    gate.reset()
    expect(gate.accept(CODE, 10)).toBe(true)
  })
})
