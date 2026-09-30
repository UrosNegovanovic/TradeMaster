import { describe, expect, it } from 'vitest'
import { resolveUploadContentType, sniffImageType } from './server-storage'

const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
const gifBytes = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00])
const webpBytes = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])
const textBytes = Buffer.from('not-an-image')

describe('sniffImageType', () => {
  it('detects jpeg, png, gif, and webp from magic bytes', () => {
    expect(sniffImageType(jpegBytes)).toBe('image/jpeg')
    expect(sniffImageType(pngBytes)).toBe('image/png')
    expect(sniffImageType(gifBytes)).toBe('image/gif')
    expect(sniffImageType(webpBytes)).toBe('image/webp')
    expect(sniffImageType(textBytes)).toBeNull()
  })

  it('sniffs jpeg and png without requiring 12 bytes', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBe('image/jpeg')
    expect(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png')
  })
})

describe('resolveUploadContentType', () => {
  it('accepts real jpeg/png/gif when Content-Type is missing or generic', () => {
    expect(resolveUploadContentType('', jpegBytes)).toBe('image/jpeg')
    expect(resolveUploadContentType(undefined, pngBytes)).toBe('image/png')
    expect(resolveUploadContentType('application/octet-stream', gifBytes)).toBe('image/gif')
  })

  it('trusts magic bytes when the declared MIME is wrong or aliased', () => {
    expect(resolveUploadContentType('image/png', jpegBytes)).toBe('image/jpeg')
    expect(resolveUploadContentType('image/jpeg', pngBytes)).toBe('image/png')
    expect(resolveUploadContentType('image/x-png', pngBytes)).toBe('image/png')
    expect(resolveUploadContentType('image/jpg', jpegBytes)).toBe('image/jpeg')
    expect(resolveUploadContentType('image/pjpeg', jpegBytes)).toBe('image/jpeg')
  })

  it('keeps avif/bmp declared-type fallback when bytes cannot be sniffed', () => {
    expect(resolveUploadContentType('image/avif', textBytes)).toBe('image/avif')
    expect(resolveUploadContentType('image/bmp', textBytes)).toBe('image/bmp')
  })

  it('rejects non-image payloads', () => {
    expect(resolveUploadContentType('text/plain', textBytes)).toBeNull()
    expect(resolveUploadContentType('application/octet-stream', textBytes)).toBeNull()
    expect(resolveUploadContentType('image/png', textBytes)).toBeNull()
  })
})
