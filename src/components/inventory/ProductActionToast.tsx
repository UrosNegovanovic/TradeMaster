'use client'

import { Package, CheckCircle2, Trash2, ScanBarcode, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useState } from 'react'

interface ProductActionToastProps {
  variant: 'scan' | 'create' | 'delete'
  product: {
    name: string
    sku: string
    imageUrl?: string | null
  }
  onDismiss?: () => void
}

export function ProductActionToast({ variant, product, onDismiss }: ProductActionToastProps) {
  const [imageError, setImageError] = useState(false)
  
  // Determine styling and content based on variant
  const config = {
    scan: {
      icon: ScanBarcode,
      iconColor: 'text-blue-500 dark:text-blue-400',
      borderColor: 'border-blue-500 dark:border-blue-600',
      bgColor: 'bg-blue-500 dark:bg-blue-600',
      badge: 'SCANNED',
      subBadge: '(+1)',
    },
    create: {
      icon: CheckCircle2,
      iconColor: 'text-green-500 dark:text-green-400',
      borderColor: 'border-green-500 dark:border-green-600',
      bgColor: 'bg-green-500 dark:bg-green-600',
      badge: 'CREATED',
      subBadge: null,
    },
    delete: {
      icon: Trash2,
      iconColor: 'text-red-500 dark:text-red-400',
      borderColor: 'border-red-500 dark:border-red-600',
      bgColor: 'bg-red-500 dark:bg-red-600',
      badge: 'DELETED',
      subBadge: null,
    },
  }[variant]

  const Icon = config.icon

  return (
    <div className={`bg-white dark:bg-gray-900 border-2 ${config.borderColor} rounded-lg shadow-xl p-3 min-w-[320px] max-w-[400px] animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-center gap-3">
        {/* Left: Product Image or Icon */}
        <div className="flex-shrink-0 w-16 h-16 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
          {product.imageUrl && !imageError ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={64}
              height={64}
              className="object-cover w-full h-full"
              onError={() => setImageError(true)}
            />
          ) : (
            <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
          )}
        </div>

        {/* Middle: Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
            {product.name}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-0.5">
            SKU: {product.sku}
          </p>
        </div>

        {/* Right: Status Badge */}
        <div className="flex-shrink-0">
          <div className={`${config.bgColor} text-white px-3 py-2 rounded-md shadow-sm`}>
            <div className="text-xs font-bold tracking-wide text-center">
              {config.badge}
            </div>
            {config.subBadge && (
              <div className="text-[10px] font-semibold opacity-90 text-center mt-0.5">
                {config.subBadge}
              </div>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
