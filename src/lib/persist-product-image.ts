import { fetchPublicHttpUrl, isSafePublicHttpUrl } from '@/lib/safe-remote-url'
import {
  extensionForImageType,
  MAX_IMAGE_BYTES,
  sniffImageType,
  uploadPublicImage,
} from '@/lib/server-storage'

const FETCH_TIMEOUT_MS = 4000

export function isStoredProductImage(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.includes('/storage/v1/object/public/product-images/')
    )
  } catch {
    return false
  }
}

function extensionFrom(contentType: string, sourceUrl: string): string {
  try {
    return extensionForImageType(contentType, new URL(sourceUrl).pathname)
  } catch {
    return extensionForImageType(contentType)
  }
}

export async function persistProductImage(
  imageUrl: string | null | undefined
): Promise<string | null> {
  if (!imageUrl || imageUrl.trim() === '') return null
  const trimmed = imageUrl.trim()
  if (isStoredProductImage(trimmed)) return trimmed
  if (!(await isSafePublicHttpUrl(trimmed))) return trimmed

  try {
    const response = await fetchPublicHttpUrl(trimmed, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'TradeMaster/1.0 (Inventory Management)',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) return trimmed

    const headerType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    if (headerType.startsWith('text/')) return trimmed

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return trimmed

    const sniffed = sniffImageType(buffer)
    const contentType = sniffed || (headerType.startsWith('image/') ? headerType : null)
    if (!contentType) return trimmed

    const ext = extensionFrom(contentType, trimmed)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`

    return (
      (await uploadPublicImage({
        bucket: 'product-images',
        path: fileName,
        body: buffer,
        contentType,
      })) || trimmed
    )
  } catch {
    return trimmed
  }
}

export function scheduleProductImagePersist(
  saveStoredUrl: (storedUrl: string) => Promise<unknown>,
  imageUrl: string | null | undefined
) {
  if (!imageUrl || isStoredProductImage(imageUrl)) return

  void persistProductImage(imageUrl)
    .then(async (stored) => {
      if (stored && stored !== imageUrl) {
        await saveStoredUrl(stored)
      }
    })
    .catch((error) => {
      console.error('Failed to persist product image', error)
    })
}
