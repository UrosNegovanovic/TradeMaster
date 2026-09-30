import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const STORAGE_BUCKETS = ['product-images', 'merchant-logos'] as const
export type StorageBucket = (typeof STORAGE_BUCKETS)[number]

export const TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
}

let storageClient: SupabaseClient | null | undefined

export function isStorageBucket(value: string): value is StorageBucket {
  return (STORAGE_BUCKETS as readonly string[]).includes(value)
}

export function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export function extensionForImageType(contentType: string, sourceName = ''): string {
  const type = contentType.split(';')[0]?.trim().toLowerCase()
  if (type && TYPE_TO_EXT[type]) return TYPE_TO_EXT[type]
  const ext = sourceName.split('.').pop()?.toLowerCase()
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext
  }
  return 'jpg'
}

function normalizeDeclaredImageType(declaredType: string | undefined): string {
  return (declaredType || '').split(';')[0]?.trim().toLowerCase() ?? ''
}

/**
 * Prefer magic-byte sniff for real JPEG/PNG/GIF/WEBP.
 * Browsers often send an empty type, application/octet-stream, or a wrong alias
 * (image/x-png, image/jpg). Those must not 415 a valid image.
 */
export function resolveUploadContentType(
  declaredType: string | undefined,
  buffer: Buffer
): string | null {
  const sniffed = sniffImageType(buffer)
  if (sniffed) return sniffed

  const declared = normalizeDeclaredImageType(declaredType)
  if (declared && TYPE_TO_EXT[declared] && (declared === 'image/avif' || declared === 'image/bmp')) {
    return declared
  }
  return null
}

export function getServiceStorageClient(): SupabaseClient | null {
  if (storageClient !== undefined) return storageClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    storageClient = null
    return null
  }
  storageClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return storageClient
}

export async function uploadPublicImage(options: {
  bucket: StorageBucket
  path: string
  body: Buffer
  contentType: string
}): Promise<string | null> {
  const supabase = getServiceStorageClient()
  if (!supabase) return null

  const { error, data } = await supabase.storage.from(options.bucket).upload(options.path, options.body, {
    contentType: options.contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error || !data?.path) return null

  const { data: urlData } = supabase.storage.from(options.bucket).getPublicUrl(data.path)
  return urlData?.publicUrl || null
}
