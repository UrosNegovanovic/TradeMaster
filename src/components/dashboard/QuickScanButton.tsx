'use client'

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScanBarcode } from 'lucide-react'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { ProductActionToast } from '@/components/inventory/ProductActionToast'
import { isValidBarcode } from '@/lib/openfoodfacts'
import { toast } from 'sonner'
import { notify } from '@/lib/notify'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { createIntakeQueue } from '@/lib/intake-request'
import { createScanGate } from '@/lib/scan-gate'

interface ProductMetadata {
  name: string
  description: string
  imageUrl: string | null
  found: boolean
  barcode: string
  source?: 'local' | 'food' | 'beauty' | 'pet' | 'products'
  categoryId?: string | null
}

interface QuickScanButtonProps {
  presentation?: 'default' | 'fab' | 'hero'
}

const QuickScanContext = createContext<{
  openScanner: (trigger: HTMLButtonElement) => void
  isProcessing: boolean
} | null>(null)

/** One scanner and one processing/cooldown state for all dashboard entry points. */
export function QuickScanProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)
  const pendingScansRef = useRef(0)
  const scannerOpenRef = useRef(false)
  // Same-code cooldown is decided at read time, never by waiting on the network.
  const scanGateRef = useRef(createScanGate())
  // ✅ Cumulative quantity tracking for same product in sequence
  const cumulativeQuantityRef = useRef<{ barcode: string; quantity: number; timestamp: number } | null>(null)
  const lookupsRef = useRef(new Map<string, Promise<ProductMetadata>>())
  // Products saved in this scanner session: repeat reads show feedback without waiting for the save.
  const savedMetadataRef = useRef(new Map<string, ProductMetadata>())
  const intakeQueueRef = useRef<{ userId: string; queue: ReturnType<typeof createIntakeQueue> } | null>(null)
  const queryClient = useQueryClient()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    scannerOpenRef.current = scannerOpen
  }, [scannerOpen])

  const resetScanSession = () => {
    scanGateRef.current.reset()
    cumulativeQuantityRef.current = null
    savedMetadataRef.current.clear()
  }

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      setScannerOpen(false)
      resetScanSession()
      previousPathRef.current = pathname
    }
  }, [pathname])

  const closeScanner = () => {
    setScannerOpen(false)
    // In-flight saves keep running in the intake queue after the scanner closes.
    resetScanSession()
    requestAnimationFrame(() => {
      const trigger = triggerRef.current
      if (trigger?.isConnected && trigger.getClientRects().length && !trigger.disabled) {
        trigger.focus()
      } else {
        const visibleTrigger = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-quick-scan-trigger]'))
          .find((button) => button.getClientRects().length && !button.disabled)
        visibleTrigger?.focus()
      }
    })
  }
  
  // ✅ Fixed toast ID to prevent stacking (new scans replace old toast)
  const SUCCESS_TOAST_ID = 'quick-scan-toast'

  const getIntakeQueue = () => {
    if (!userId) return null
    if (intakeQueueRef.current?.userId !== userId) {
      intakeQueueRef.current = { userId, queue: createIntakeQueue(userId, window.sessionStorage) }
    }
    return intakeQueueRef.current.queue
  }

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

      const queue = getIntakeQueue()
      if (!queue) return { success: false }
      const { result } = await queue.submit(productData)

      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] })

      return {
        success: true,
        action: result?.action || 'created',
        quantityAdded: result?.quantityAdded,
      }
    } catch (error) {
      console.error('Error auto-saving product:', error)
      return { success: false }
    }
  }

  const lookupProduct = (cleanBarcode: string) => {
    const inFlight = lookupsRef.current.get(cleanBarcode)
    if (inFlight) return inFlight
    const lookup = (async () => {
      // ✅ UNIFIED PRODUCT LOOKUP: Check local DB first, then external APIs
      const response = await fetch(`/api/products/fetch-by-barcode?barcode=${encodeURIComponent(cleanBarcode)}`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      return (await response.json()) as ProductMetadata
    })()
    lookupsRef.current.set(cleanBarcode, lookup)
    lookup.finally(() => lookupsRef.current.delete(cleanBarcode)).catch(() => {})
    return lookup
  }

  const showSuccessToast = (metadata: ProductMetadata, barcode: string, cleanBarcode: string, action: 'created' | 'updated') => {
    // ✅ CUMULATIVE QUANTITY TRACKING: Update ONLY when a scan is shown as counted
    const sequenceWindowMs = 15000 // 15 seconds window for "same product in sequence" (increased from 5s to prevent premature resets)
    const saveTimestamp = Date.now()
    const previous = cumulativeQuantityRef.current

    if (previous && previous.barcode === cleanBarcode && saveTimestamp - previous.timestamp < sequenceWindowMs) {
      // ✅ SAME PRODUCT IN SEQUENCE: Increment cumulative quantity
      cumulativeQuantityRef.current = {
        barcode: cleanBarcode,
        quantity: previous.quantity + 1,
        timestamp: saveTimestamp,
      }
    } else {
      // First scan, different product, or sequence timeout (>15s) - reset
      cumulativeQuantityRef.current = {
        barcode: cleanBarcode,
        quantity: 1,
        timestamp: saveTimestamp,
      }
    }

    const cumulativeQuantity = cumulativeQuantityRef.current.quantity

    // Determine badge text based on action
    const badgeText = action === 'updated' ? 'AŽURIRANO' : 'SKENIRANO'
    // ✅ Show cumulative quantity for same product in sequence (+1, +2, +3...)
    const subBadgeText = action === 'updated' 
      ? `(+${cumulativeQuantity})` 
      : cumulativeQuantity > 1 
      ? `(+${cumulativeQuantity})` // Show cumulative even for new products if scanned multiple times
      : '(NOVI)'

    // ✅ HERO TOAST: The ONLY toast that appears on successful scan
    toast.custom((id) => (
      <ProductActionToast
        variant="scan"
        product={{
          name: metadata.name,
          sku: barcode,
          imageUrl: metadata.imageUrl,
        }}
        customBadge={badgeText}
        customSubBadge={subBadgeText}
        onDismiss={() => toast.dismiss(id)}
      />
    ), {
      id: SUCCESS_TOAST_ID,
      duration: 3000,
      unstyled: true,
    })
  }

  const showSaveFailed = (cleanBarcode: string) => {
    notify.error('Greška pri čuvanju', {
      description: 'Unos nije potvrđen. Ponovo skenirajte isti barkod u ovoj kartici da bezbedno proverite i završite unos.',
      duration: 3000,
    })
    // Allow an immediate rescan, which confirms the unconfirmed intake
    savedMetadataRef.current.delete(cleanBarcode)
    scanGateRef.current.release(cleanBarcode)
    cumulativeQuantityRef.current = null
  }

  const beginScanWork = () => {
    pendingScansRef.current += 1
    processingRef.current = true
    setIsProcessing(true)
  }

  const endScanWork = () => {
    // Brief delay keeps the "Obrada..." state visible after feedback
    setTimeout(() => {
      pendingScansRef.current -= 1
      if (pendingScansRef.current === 0) {
        processingRef.current = false
        setIsProcessing(false)
      }
    }, 500)
  }

  /**
   * Continuous Scanning Mode Handler
   * - Same-code cooldown (scan-gate) decides instantly; nothing waits on the network
   * - Repeat reads of a product already saved this session show "+N" immediately and save in the background
   * - First read of a product: lookup, save, then feedback
   * - Keeps scanner open for next scan
   */
  const handleScanSuccess = async (barcode: string) => {
    // Validate barcode format FIRST
    if (!isValidBarcode(barcode)) {
      notify.error('Nevažeći barkod', {
        description: 'Skenirani barkod je prekratak ili nevažeći. Pokušajte ponovo.',
        duration: 2000,
      })
      return
    }

    // Reads can still arrive in the frame after a redirect closed the scanner
    if (!scannerOpenRef.current) return

    // Clean barcode for comparison (remove spaces, non-numeric characters)
    const cleanBarcode = barcode.replace(/\D/g, '')

    if (!scanGateRef.current.accept(cleanBarcode, Date.now())) {
      // ✅ SILENT MODE: No toast, just silently ignore duplicate scan
      return
    }

    beginScanWork()

    const saved = savedMetadataRef.current.get(cleanBarcode)
    if (saved) {
      // Today's row exists after the first save, so the server answers 'updated'.
      showSuccessToast(saved, barcode, cleanBarcode, 'updated')
      try {
        const saveResult = await autoSaveProduct(saved, cleanBarcode)
        if (!saveResult.success) showSaveFailed(cleanBarcode)
      } finally {
        endScanWork()
      }
      return
    }

    try {
      const metadata = await lookupProduct(cleanBarcode)
      
      if (metadata && metadata.found) {
        // ✅ PRODUCT FOUND: Auto-save to database
        const saveResult = await autoSaveProduct(metadata, cleanBarcode)
        
        if (saveResult.success) {
          savedMetadataRef.current.set(cleanBarcode, metadata)
          showSuccessToast(metadata, barcode, cleanBarcode, saveResult.action ?? 'created')
        } else {
          showSaveFailed(cleanBarcode)
        }
      } else if (scannerOpenRef.current) {
        // ❌ PRODUCT NOT FOUND: Redirect to Inventory Add Product page
        // ✅ Keep error toast visible (user needs to know why redirect happened)
        notify.error('Proizvod nije pronađen', {
          description: 'Preusmjeravanje na stranicu za dodavanje proizvoda...',
          duration: 3000,
        })
        
        // Close scanner modal
        scannerOpenRef.current = false
        setScannerOpen(false)
        
        // ✅ Redirect to Inventory page with barcode as query parameter
        // Using the existing pattern: /inventory?scan=true&sku=...&name=...
        const redirectUrl = `/inventory?scan=true&sku=${encodeURIComponent(cleanBarcode)}`
        router.push(redirectUrl)
      }
    } catch (error) {
      console.error('Error in continuous scan:', error)
      
      notify.error('Greška pri skeniranju', {
        description: 'Neuspešna obrada barkoda. Pokušajte ponovo.',
        duration: 3000,
      })
      // Reset cooldown and cumulative quantity on error to allow retry
      scanGateRef.current.release(cleanBarcode)
      cumulativeQuantityRef.current = null
    } finally {
      endScanWork()
    }
  }

  return (
    <QuickScanContext.Provider value={{
      openScanner: (trigger) => {
        if (processingRef.current) return
        triggerRef.current = trigger
        setScannerOpen(true)
      },
      isProcessing,
    }}>
      {children}
      {scannerOpen && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={closeScanner}
          onManualEntry={() => {
            closeScanner()
            router.push('/inventory?scan=true')
          }}
          onScanSuccess={handleScanSuccess}
          continuousMode={true}
        />
      )}
    </QuickScanContext.Provider>
  )
}

export function QuickScanButton({ presentation = 'default' }: QuickScanButtonProps) {
  const session = useContext(QuickScanContext)
  if (!session) throw new Error('QuickScanButton must be inside QuickScanProvider')
  const { openScanner, isProcessing } = session

  return (
    <>
      {presentation === 'fab' ? (
        <Button
          type="button"
          size="icon"
          className="h-14 w-14 min-h-11 min-w-11 rounded-full shadow-lg ring-4 ring-background"
          aria-label="Skeniraj proizvod"
          data-quick-scan-trigger
          onClick={(event) => openScanner(event.currentTarget)}
          disabled={isProcessing}
        >
          <ScanBarcode className="h-6 w-6" />
        </Button>
      ) : presentation === 'hero' ? (
        <Button
          type="button"
          size="lg"
          className="h-12 w-full min-h-12 text-base"
          data-quick-scan-trigger
          onClick={(event) => openScanner(event.currentTarget)}
          disabled={isProcessing}
        >
          <ScanBarcode className="mr-2 h-5 w-5" />
          {isProcessing ? 'Obrada...' : 'Skeniraj proizvod'}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="h-11 w-full justify-start text-sm"
          data-quick-scan-trigger
          onClick={(event) => openScanner(event.currentTarget)}
          disabled={isProcessing}
        >
          <ScanBarcode className="mr-2 h-4 w-4" />
          {isProcessing ? 'Obrada...' : 'Skeniraj proizvod'}
        </Button>
      )}

    </>
  )
}
