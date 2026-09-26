import { describe, expect, it, vi } from 'vitest'
import { getCamerasWithTimeout, cameraAccessMessage } from './camera-access'

describe('camera access safeguards', () => {
  it('does not delay successful camera access or impose a scanning time limit', async () => {
    vi.useFakeTimers()
    const result = getCamerasWithTimeout(() => Promise.resolve(['camera-a']), 7_000)

    await expect(result).resolves.toEqual(['camera-a'])
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })

  it('rejects a stalled permission prompt within the configured timeout', async () => {
    vi.useFakeTimers()
    const result = getCamerasWithTimeout(() => new Promise(() => {}), 7_000)
    const rejection = expect(result).rejects.toMatchObject({ name: 'CameraTimeoutError' })
    await vi.advanceTimersByTimeAsync(7_000)

    await rejection
    vi.useRealTimers()
  })

  it('returns a clear Serbian message when permission is denied', () => {
    expect(cameraAccessMessage({ name: 'NotAllowedError', message: 'Permission denied' })).toBe(
      'Nema dozvole za kameru. Dozvolite pristup u pregledaču ili unesite barkod ručno.'
    )
  })

  it('returns a clear Serbian message when the device has no camera', () => {
    expect(cameraAccessMessage({ name: 'NotFoundError', message: 'No cameras found' })).toBe(
      'Kamera nije pronađena na ovom uređaju. Unesite barkod ručno.'
    )
  })
})
