import { beforeEach, describe, expect, it, vi } from 'vitest'

const lookup = vi.fn()

vi.mock('node:dns/promises', () => ({
  lookup: (...args: unknown[]) => lookup(...args),
}))

import { assertSafePublicHttpUrl, fetchPublicHttpUrl, isBlockedIp, isSafePublicHttpUrl } from './safe-remote-url'

describe('isBlockedIp', () => {
  it('blocks loopback, private, and link-local addresses', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true)
    expect(isBlockedIp('10.0.0.8')).toBe(true)
    expect(isBlockedIp('192.168.1.20')).toBe(true)
    expect(isBlockedIp('172.16.0.2')).toBe(true)
    expect(isBlockedIp('169.254.169.254')).toBe(true)
    expect(isBlockedIp('::1')).toBe(true)
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true)
  })

  it('allows public addresses', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false)
    expect(isBlockedIp('1.1.1.1')).toBe(false)
  })
})

describe('assertSafePublicHttpUrl', () => {
  beforeEach(() => {
    lookup.mockReset()
    lookup.mockResolvedValue([{ address: '1.2.3.4', family: 4 }])
  })

  it('rejects localhost and metadata URLs without resolving', async () => {
    await expect(assertSafePublicHttpUrl('http://localhost/latest')).rejects.toThrow()
    await expect(assertSafePublicHttpUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow()
    await expect(assertSafePublicHttpUrl('http://127.0.0.1/admin')).rejects.toThrow()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('rejects hostnames that resolve to a private address', async () => {
    lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }])
    await expect(assertSafePublicHttpUrl('https://metadata.example/img.jpg')).rejects.toThrow()
    expect(await isSafePublicHttpUrl('https://metadata.example/img.jpg')).toBe(false)
  })

  it('allows a public https image host', async () => {
    await expect(
      assertSafePublicHttpUrl('https://images.openfoodfacts.org/images/products/1.jpg')
    ).resolves.toBeInstanceOf(URL)
  })
})

describe('fetchPublicHttpUrl', () => {
  beforeEach(() => {
    lookup.mockReset()
    lookup.mockResolvedValue([{ address: '1.2.3.4', family: 4 }])
  })

  it('does not follow a redirect onto a metadata IP', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data' },
      })
    )

    await expect(
      fetchPublicHttpUrl('https://images.openfoodfacts.org/images/products/1.jpg')
    ).rejects.toThrow()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    fetchSpy.mockRestore()
  })
})
