import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  extensionForImageType,
  isStorageBucket,
  MAX_IMAGE_BYTES,
  resolveUploadContentType,
  type StorageBucket,
  uploadPublicImage,
} from '@/lib/server-storage'
import { accessExpiredResponse } from '@/lib/access-guard'

export const dynamic = 'force-dynamic'

function randomFileName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, accessExpiresAt: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const expired = accessExpiredResponse(profile)
    if (expired) return expired

    const form = await request.formData()
    const bucketValue = form.get('bucket')
    const fileValue = form.get('file')

    if (typeof bucketValue !== 'string' || !isStorageBucket(bucketValue)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }
    const bucket: StorageBucket = bucketValue

    if (!(fileValue instanceof Blob) || fileValue.size === 0) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }
    if (fileValue.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const buffer = Buffer.from(await fileValue.arrayBuffer())
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const declaredType = 'type' in fileValue ? fileValue.type : ''
    const contentType = resolveUploadContentType(declaredType, buffer)
    if (!contentType) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
    }

    const fileName =
      fileValue instanceof File && fileValue.name ? fileValue.name : `upload.${extensionForImageType(contentType)}`
    const path = `${profile.id}/${randomFileName(extensionForImageType(contentType, fileName))}`
    const url = await uploadPublicImage({ bucket, path, body: buffer, contentType })
    if (!url) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
    }

    return NextResponse.json({ url, bucket, path })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
