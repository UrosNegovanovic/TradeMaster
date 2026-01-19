'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScanBarcode } from 'lucide-react'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { fetchProductMetadata, isValidBarcode } from '@/lib/openfoodfacts'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function QuickScanButton() {
  const [scannerOpen, setScannerOpen] = useState(false)
  const router = useRouter()

  const handleScanSuccess = async (barcode: string) => {
    // Validate barcode format
    if (!isValidBarcode(barcode)) {
      toast.error('Invalid barcode', {
        description: 'The scanned barcode is too short or invalid. Please try again.',
      })
      return
    }

    toast.success('Barcode scanned', {
      description: `SKU: ${barcode}`,
    })

    // Fetch product metadata from OpenFoodFacts
    try {
      const metadata = await fetchProductMetadata(barcode)
      
      if (metadata && metadata.found) {
        // Show success message with source indication
        const sourceLabels = {
          food: '🍫 Food',
          beauty: '💄 Beauty',
          products: '🧴 Household',
        }
        const sourceLabel = metadata.source ? sourceLabels[metadata.source] : 'Database'
        
        toast.success(`Product found! (${sourceLabel})`, {
          description: `${metadata.name} - Redirecting...`,
          duration: 3000,
        })
        
        // Redirect to inventory with pre-filled data in URL params
        const params = new URLSearchParams({
          sku: barcode,
          name: metadata.name,
          description: metadata.description || '',
          imageUrl: metadata.imageUrl || '',
        })
        router.push(`/inventory?scan=true&${params.toString()}`)
      } else {
        toast.info('Product not found', {
          description: 'Searched 3 databases (food, beauty, household). Enter details manually.',
          duration: 5000,
        })
        router.push(`/inventory?scan=true&sku=${barcode}`)
      }
    } catch (error) {
      console.error('Error fetching product metadata:', error)
      toast.error('Failed to fetch product info', {
        description: 'Redirecting to add product manually...',
      })
      router.push(`/inventory?scan=true&sku=${barcode}`)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-sm"
        onClick={() => setScannerOpen(true)}
      >
        <ScanBarcode className="mr-2 h-4 w-4" />
        Quick Scan Product
      </Button>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  )
}
