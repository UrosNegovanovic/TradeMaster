import { describe, expect, it } from 'vitest'
import {
  isDisplayableImageSrc,
  isPreviewOnlyImageSrc,
  persistableImageUrl,
} from './image-src'

const stored =
  'https://abc.supabase.co/storage/v1/object/public/merchant-logos/p/logo.jpg'

describe('isDisplayableImageSrc', () => {
  it('accepts public http(s) logos and data-image previews', () => {
    expect(isDisplayableImageSrc(stored)).toBe(true)
    expect(isDisplayableImageSrc('data:image/png;base64,aaa')).toBe(true)
  })

  it('rejects empty, blob, and non-image values', () => {
    expect(isDisplayableImageSrc(null)).toBe(false)
    expect(isDisplayableImageSrc('')).toBe(false)
    expect(isDisplayableImageSrc('blob:https://trade-master-seven.vercel.app/1')).toBe(false)
    expect(isDisplayableImageSrc('javascript:alert(1)')).toBe(false)
  })
})

describe('persistableImageUrl', () => {
  it('keeps a stored public URL and treats empty as an explicit clear', () => {
    expect(persistableImageUrl(stored)).toBe(stored)
    expect(persistableImageUrl('')).toBeNull()
    expect(persistableImageUrl(null)).toBeNull()
  })

  it('omits preview-only and missing values so a PUT cannot wipe the saved logo', () => {
    expect(persistableImageUrl(undefined)).toBeUndefined()
    expect(persistableImageUrl('data:image/png;base64,aaa')).toBeUndefined()
    expect(persistableImageUrl('blob:https://app.local/1')).toBeUndefined()
    expect(isPreviewOnlyImageSrc('data:image/jpeg;base64,xx')).toBe(true)
  })
})
