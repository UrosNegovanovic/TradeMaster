'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScanBarcode } from 'lucide-react'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { ProductActionToast } from '@/components/inventory/ProductActionToast'
import { isValidBarcode } from '@/lib/openfoodfacts'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface ProductMetadata {
  name: string
  description: string
  imageUrl: string | null
  found: boolean
  barcode: string
  source?: 'local' | 'food' | 'beauty' | 'products'
  categoryId?: string | null
}

export function QuickScanButton() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false) // Prevent duplicate processing
  const queryClient = useQueryClient()

  /**
   * Auto-save product to database
   * Uses default values for missing fields (price = 0, quantity = 1)
   * Returns the saved product data with action info ('created' | 'updated')
   */
  const autoSaveProduct = async (
    metadata: ProductMetadata, 
    barcode: string
  ): Promise<{ success: boolean; action?: 'created' | 'updated'; quantityAdded?: number }> => {
    try {
      const productData = {
        name: metadata.name || 'Unknown Product',
        sku: barcode,
        price: 0, // Default to 0 for quick intake (user can update later)
        quantity: 1, // Default quantity
        description: metadata.description || '',
        imageUrl: metadata.imageUrl || '',
        categoryId: metadata.categoryId || null,
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save product')
      }

      const result = await response.json()

      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] })

      return {
        success: true,
        action: result.action || 'created',
        quantityAdded: result.quantityAdded,
      }
    } catch (error) {
      console.error('Error auto-saving product:', error)
      return { success: false }
    }
  }

  /**
   * Continuous Scanning Mode Handler
   * - Fetches product data (local DB or external APIs)
   * - Auto-saves if found
   * - Shows success/error feedback
   * - Keeps scanner open for next scan
   */
  const handleScanSuccess = async (barcode: string) => {
    // Prevent duplicate processing if already handling a scan
    if (processingRef.current) {
      console.log('⏸️ Already processing a scan, ignoring duplicate...')
      return
    }

    // Validate barcode format
    if (!isValidBarcode(barcode)) {
      toast.error('Invalid barcode', {
        description: 'The scanned barcode is too short or invalid. Please try again.',
        duration: 2000,
      })
      return
    }

    // Mark as processing
    processingRef.current = true
    setIsProcessing(true)

    try {
      // Clean barcode (remove spaces, non-numeric characters)
      const cleanBarcode = barcode.replace(/\D/g, '')
      
      // ✅ UNIFIED PRODUCT LOOKUP: Check local DB first, then external APIs
      const response = await fetch(`/api/products/fetch-by-barcode?barcode=${encodeURIComponent(cleanBarcode)}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const metadata: ProductMetadata = await response.json()
      
      if (metadata && metadata.found) {
        // ✅ PRODUCT FOUND: Auto-save to database
        const saveResult = await autoSaveProduct(metadata, cleanBarcode)
        
        if (saveResult.success) {
          // Determine action message based on actual API response
          const actionMessage = saveResult.action === 'updated'
            ? 'Stock updated'
            : 'Product saved'
          
          const sourceMessage = metadata.source === 'local'
            ? saveResult.action === 'updated'
              ? `Quantity incremented (+${saveResult.quantityAdded || 1})`
              : 'Found in your inventory'
            : metadata.source === 'food'
            ? 'Found in food database'
            : metadata.source === 'beauty'
            ? 'Found in beauty database'
            : 'Found in product database'

          // Show rich success toast
          toast.custom((id) => (
            <ProductActionToast
              variant="scan"
              product={{
                name: metadata.name,
                sku: barcode,
                imageUrl: metadata.imageUrl,
              }}
              onDismiss={() => toast.dismiss(id)}
            />
          ), {
            duration: 2500,
          })
          
          // Show success message
          toast.success(actionMessage, {
            description: `${metadata.name} - ${sourceMessage}`,
            duration: 2000,
          })
        } else {
          // Save failed but product was found
          toast.error('Failed to save product', {
            description: 'Product found but could not be saved. Please try again.',
            duration: 3000,
          })
        }
      } else {
        // ❌ PRODUCT NOT FOUND: Show error but keep scanner open
        toast.error('Product not found', {
          description: 'Searched your inventory and 4 external databases. Scan another item or close to add manually.',
          duration: 4000,
        })
      }
    } catch (error) {
      console.error('Error in continuous scan:', error)
      
      toast.error('Scan error', {
        description: 'Failed to process barcode. Please try again.',
        duration: 3000,
      })
    } finally {
      // Reset processing state after a brief delay (allows user to see feedback)
      setTimeout(() => {
        processingRef.current = false
        setIsProcessing(false)
      }, 1500) // 1.5 second delay before allowing next scan
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-sm"
        onClick={() => setScannerOpen(true)}
        disabled={isProcessing}
      >
        <ScanBarcode className="mr-2 h-4 w-4" />
        {isProcessing ? 'Processing...' : 'Quick Scan Product'}
      </Button>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false)
          processingRef.current = false
          setIsProcessing(false)
        }}
        onScanSuccess={handleScanSuccess}
        continuousMode={true} // ✅ Enable continuous scanning mode
      />
    </>
  )
}
