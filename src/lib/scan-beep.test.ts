import { describe, expect, it, vi } from 'vitest'
import { createScanBeep, SCAN_BEEP_MIN_GAP_MS } from './scan-beep'

function fakeAudio(state: AudioContextState = 'running') {
  const oscillators: Array<{ start: ReturnType<typeof vi.fn> }> = []
  const audio = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => { audio.state = 'running' }),
    createOscillator: vi.fn(() => {
      const oscillator = { connect: vi.fn(), frequency: { value: 0 }, type: '', start: vi.fn(), stop: vi.fn() }
      oscillators.push(oscillator)
      return oscillator
    }),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    })),
  }
  return { audio, oscillators }
}

describe('scan beep', () => {
  it('plays one tone and reuses the audio context', async () => {
    const { audio, oscillators } = fakeAudio()
    const create = vi.fn(() => audio as never)
    let clock = 0
    const beep = createScanBeep(create, () => clock)

    expect(await beep.play()).toBe(true)
    clock += SCAN_BEEP_MIN_GAP_MS
    expect(await beep.play()).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    expect(oscillators).toHaveLength(2)
    expect(oscillators[0].start).toHaveBeenCalled()
  })

  it('throttles beeps closer than the minimum gap', async () => {
    const { audio, oscillators } = fakeAudio()
    let clock = 0
    const beep = createScanBeep(() => audio as never, () => clock)
    expect(await beep.play()).toBe(true)
    clock += SCAN_BEEP_MIN_GAP_MS - 1
    expect(await beep.play()).toBe(false)
    expect(oscillators).toHaveLength(1)
  })

  it('stays silent when the user turned sound off', async () => {
    const { audio } = fakeAudio()
    const create = vi.fn(() => audio as never)
    const beep = createScanBeep(create, () => 0)
    beep.setEnabled(false)
    beep.unlock()
    expect(await beep.play()).toBe(false)
    expect(create).not.toHaveBeenCalled()
    expect(beep.isEnabled()).toBe(false)
  })

  it('resumes a suspended context on unlock and before playing', async () => {
    const { audio } = fakeAudio('suspended')
    const beep = createScanBeep(() => audio as never, () => 0)
    beep.unlock()
    expect(audio.resume).toHaveBeenCalledTimes(1)
    audio.state = 'suspended'
    expect(await beep.play()).toBe(true)
    expect(audio.resume).toHaveBeenCalledTimes(2)
  })

  it('never throws without audio support and recreates a broken context', async () => {
    let clock = 0
    expect(await createScanBeep(() => null, () => clock).play()).toBe(false)

    const broken = { ...fakeAudio().audio, createOscillator: () => { throw new Error('closed') } }
    const healthy = fakeAudio().audio
    const create = vi.fn().mockReturnValueOnce(broken).mockReturnValueOnce(healthy)
    const beep = createScanBeep(create, () => clock)
    expect(await beep.play()).toBe(false)
    clock += SCAN_BEEP_MIN_GAP_MS
    expect(await beep.play()).toBe(true)
    expect(create).toHaveBeenCalledTimes(2)
  })
})
