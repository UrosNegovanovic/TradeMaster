import { readApiErrorMessage } from '@/lib/api-error'
import type { SessionFetch } from '@/lib/authorized-fetch'
import { persistableImageUrl } from '@/lib/image-src'
import type { StorageBucket } from '@/lib/server-storage'
import { sr } from '@/lib/ui-copy'

/** Clerk-authenticated upload. Browser must not call Supabase Storage INSERT. */
export async function uploadImageViaApi(
  file: File,
  bucket: StorageBucket,
  request: SessionFetch
): Promise<string> {
  const form = new FormData()
  form.set('bucket', bucket)
  form.set('file', file)

  const response = await request('/api/uploads', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, sr.image.uploadFailed))
  }

  const data = (await response.json()) as { url?: string }
  const storedUrl = persistableImageUrl(data.url)
  if (!storedUrl) {
    throw new Error('Javna adresa slike nije dostupna')
  }
  return storedUrl
}
