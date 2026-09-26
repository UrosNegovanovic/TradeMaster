'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { notify } from '@/lib/notify'
import Image from 'next/image'
import { sr } from '@/lib/ui-copy'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  bucket: 'product-images' | 'merchant-logos'
  label?: string
  description?: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  label = sr.image.label,
  description,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(
    value && value !== '' ? value : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update preview when value changes externally
  React.useEffect(() => {
    setPreview(value && value !== '' ? value : null)
  }, [value])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify.error(sr.image.invalidFile, {
        description: sr.image.selectImage,
      })
      return
    }

    if (file.type === 'image/heic' || file.type === 'image/heif') {
      notify.error(sr.image.unsupportedFormat, {
        description: sr.image.unsupportedFormatDescription,
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.error(sr.image.tooLarge, {
        description: sr.image.tooLargeDescription,
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Supabase
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)

      // Generate unique filename with timestamp
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload file
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000',
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      if (urlData?.publicUrl) {
        onChange(urlData.publicUrl)
        setPreview(urlData.publicUrl)
      } else {
        throw new Error('Javna adresa slike nije dostupna')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      notify.error(sr.image.uploadFailed, {
        description: error instanceof Error ? error.message : sr.image.uploadFailed,
      })
      setPreview(null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    onChange(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
      )}

      <div className="space-y-4">
        {/* Preview */}
        {preview && (
          <div className="relative w-full h-48 rounded-md border overflow-hidden bg-muted">
            {preview.startsWith('data:') ? (
              // Use regular img for data URLs (FileReader preview)
              <img
                src={preview}
                alt={sr.image.preview}
                className="w-full h-full object-contain"
                onError={() => {
                  setPreview(null)
                }}
              />
            ) : (
              // Use Next.js Image for http/https URLs
              <Image
                src={preview}
                alt={sr.image.preview}
                fill
                className="object-contain"
                onError={() => {
                  setPreview(null)
                }}
              />
            )}
            {!uploading && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Upload Button */}
        <div className="flex items-center gap-4">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {sr.image.uploading}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {preview ? sr.image.change : sr.image.upload}
              </>
            )}
          </Button>
          {preview && !uploading && (
            <span className="text-sm text-muted-foreground">
              {sr.image.success}
            </span>
          )}
        </div>

        {/* Placeholder when no image */}
        {!preview && !uploading && (
          <div className="w-full h-48 rounded-md border-2 border-dashed flex items-center justify-center bg-muted">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {sr.image.empty}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
