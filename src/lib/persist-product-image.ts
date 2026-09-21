import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const MAX_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 4000

const TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
}

let storageClient: SupabaseClient | null | undefined

function getStorageClient(): SupabaseClient | null {
  if (storageClient !== undefined) return storageClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    storageClient = null
    return null
  }
  storageClient = createClient(url, key)
  return storageClient
}

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

function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif'
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function extensionFrom(contentType: string, sourceUrl: string): string {
  const type = contentType.split(';')[0]?.trim().toLowerCase()
  if (type && TYPE_TO_EXT[type]) return TYPE_TO_EXT[type]
  try {
    const ext = new URL(sourceUrl).pathname.split('.').pop()?.toLowerCase()
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext
    }
  } catch {
    // keep fallback
  }
  return 'jpg'
}

export async function persistProductImage(
  imageUrl: string | null | undefined
): Promise<string | null> {
  if (!imageUrl || imageUrl.trim() === '') return null
  const trimmed = imageUrl.trim()
  if (isStoredProductImage(trimmed)) return trimmed

  try {
    const response = await fetch(trimmed, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'TradeMaster/1.0 (Inventory Management)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) return trimmed

    const headerType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    if (headerType.startsWith('text/')) return trimmed

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return trimmed

    const sniffed = sniffImageType(buffer)
    const contentType = sniffed || (headerType.startsWith('image/') ? headerType : null)
    if (!contentType) return trimmed

    const ext = extensionFrom(contentType, trimmed)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`

    const supabase = getStorageClient()
    if (!supabase) return trimmed

    const { error, data } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      })

    if (error || !data?.path) return trimmed

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return urlData?.publicUrl || trimmed
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
