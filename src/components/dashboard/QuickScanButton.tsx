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
  const router = useRouter()
  const pathname = usePathname()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false) // Prevent duplicate processing
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null) // Smart cooldown tracking
  // ✅ Cumulative quantity tracking for same product in sequence
  const cumulativeQuantityRef = useRef<{ barcode: string; quantity: number; timestamp: number } | null>(null)
  const queryClient = useQueryClient()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      setScannerOpen(false)
      lastScanRef.current = null
      cumulativeQuantityRef.current = null
      previousPathRef.current = pathname
    }
  }, [pathname])

  const closeScanner = () => {
    setScannerOpen(false)
    // An in-flight save still owns the processing lock until its finally block.
    lastScanRef.current = null
    cumulativeQuantityRef.current = null
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

  // 🔍 DEBUG: Logging helper function (available throughout component)
  const logToServer = (message: string, data: any, hypothesisId: string = 'A') => {
    const logData = {
      location: 'QuickScanButton.tsx',
      message,
      data: { ...data, timestamp: Date.now() },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    }
    // Try to detect ngrok or use localhost - check for ngrok.io or ngrok-free.app domains
    let baseUrl = 'http://127.0.0.1:7244'
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname.includes('ngrok') || hostname.includes('ngrok-free') || hostname.includes('ngrok.io')) {
        baseUrl = `${window.location.protocol}//${hostname}`
      }
    }
    fetch(`${baseUrl}/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(() => {})
    console.log(`[LOG] ${message}`, data)
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
    // Validate barcode format FIRST
    if (!isValidBarcode(barcode)) {
      notify.error('Nevažeći barkod', {
        description: 'Skenirani barkod je prekratak ili nevažeći. Pokušajte ponovo.',
        duration: 2000,
      })
      return
    }

    // Clean barcode for comparison (remove spaces, non-numeric characters)
    const cleanBarcode = barcode.replace(/\D/g, '')

    // ✅ SMART COOLDOWN: Check BEFORE processing (2-second cooldown for faster scanning)
    const now = Date.now()
    const cooldownMs = 2000 // 2 seconds cooldown for same barcode (reduced from 3s for faster workflow)
    
    // #region agent log
    console.log('[DEBUG] Smart Cooldown check START', { cleanBarcode, lastScanRef: lastScanRef.current, now, cooldownMs, cumulativeQuantityRef: cumulativeQuantityRef.current });
    // #endregion
    
    if (lastScanRef.current) {
      const { barcode: lastBarcode, timestamp: lastTimestamp } = lastScanRef.current
      const timeSinceLastScan = now - lastTimestamp
      
      // #region agent log
      console.log('[DEBUG] Smart Cooldown comparison', { cleanBarcode, lastBarcode, timeSinceLastScan, cooldownMs, isSame: cleanBarcode === lastBarcode, isBlocked: cleanBarcode === lastBarcode && timeSinceLastScan < cooldownMs });
      // #endregion
      
      // Check if it's the SAME barcode AND too soon (within cooldown period)
      if (cleanBarcode === lastBarcode && timeSinceLastScan < cooldownMs) {
        // ✅ SILENT MODE: No toast, just silently ignore duplicate scan
        console.log(`🚫 Duplicate scan prevented: ${cleanBarcode} (scanned ${timeSinceLastScan}ms ago, cooldown: ${cooldownMs}ms)`)
        return
      }
      
      // Different barcode OR enough time passed - proceed normally
      if (cleanBarcode !== lastBarcode) {
        console.log(`✅ Different barcode detected: ${lastBarcode} → ${cleanBarcode} (instant processing)`)
      } else {
        console.log(`✅ Cooldown expired for ${cleanBarcode} (${timeSinceLastScan}ms passed)`)
      }
    }

    // ✅ Check if same barcode is already being processed
    if (processingRef.current && lastScanRef.current && lastScanRef.current.barcode === cleanBarcode) {
      // ✅ SILENT MODE: No toast, just silently ignore
      console.log('⏸️ Same barcode already processing, ignoring duplicate...')
      return
    }

    // Prevent duplicate processing if already handling a DIFFERENT scan
    if (processingRef.current) {
      // ✅ SILENT MODE: No toast, just silently ignore
      console.log('⏸️ Already processing a different scan, ignoring...')
      return
    }

    // Mark as processing
    processingRef.current = true
    setIsProcessing(true)

    // ✅ SILENT MODE: No loading toast - user expects instant feedback

    try {
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
          // ✅ UPDATE LAST SCAN ONLY AFTER SUCCESSFUL SAVE (prevents blocking valid scans)
          lastScanRef.current = {
            barcode: cleanBarcode,
            timestamp: Date.now(),
          }
          
          // ✅ CUMULATIVE QUANTITY TRACKING: Update ONLY after successful save
          const sequenceWindowMs = 15000 // 15 seconds window for "same product in sequence" (increased from 5s to prevent premature resets)
          const saveTimestamp = Date.now()
          
          logToServer('Cumulative quantity check START', { 
            cleanBarcode, 
            currentRef: cumulativeQuantityRef.current, 
            saveTimestamp, 
            sequenceWindowMs 
          })
          
          if (cumulativeQuantityRef.current) {
            const { barcode: lastBarcode, quantity: lastQuantity, timestamp: lastTimestamp } = cumulativeQuantityRef.current
            const timeSinceLastScan = saveTimestamp - lastTimestamp
            
            logToServer('Cumulative quantity comparison', { 
              cleanBarcode, 
              lastBarcode, 
              lastQuantity, 
              lastTimestamp, 
              timeSinceLastScan, 
              sequenceWindowMs, 
              isSame: cleanBarcode === lastBarcode, 
              isWithinWindow: timeSinceLastScan < sequenceWindowMs 
            })
            
            if (cleanBarcode === lastBarcode && timeSinceLastScan < sequenceWindowMs) {
              // ✅ SAME PRODUCT IN SEQUENCE: Increment cumulative quantity
              const newQuantity = lastQuantity + 1
              cumulativeQuantityRef.current = {
                barcode: cleanBarcode,
                quantity: newQuantity,
                timestamp: saveTimestamp,
              }
              console.log(`📊 Same product in sequence: ${cleanBarcode} (quantity: ${newQuantity})`)
              
              logToServer('Cumulative quantity INCREMENTED', { 
                cleanBarcode, 
                newQuantity, 
                updatedRef: cumulativeQuantityRef.current 
              })
            } else if (cleanBarcode !== lastBarcode) {
              // ✅ DIFFERENT PRODUCT: Reset cumulative quantity
              cumulativeQuantityRef.current = {
                barcode: cleanBarcode,
                quantity: 1,
                timestamp: saveTimestamp,
              }
              console.log(`🔄 Different product detected: ${lastBarcode} → ${cleanBarcode} (reset quantity to 1)`)
              
              logToServer('Cumulative quantity RESET (different product)', { 
                cleanBarcode, 
                lastBarcode, 
                updatedRef: cumulativeQuantityRef.current 
              })
            } else {
              // Timeout - reset (same barcode but timeSinceLastScan >= sequenceWindowMs)
              // ⚠️ This happens when user waits too long between scans (>15s)
              cumulativeQuantityRef.current = {
                barcode: cleanBarcode,
                quantity: 1,
                timestamp: saveTimestamp,
              }
              
              logToServer('Cumulative quantity RESET (timeout)', { 
                cleanBarcode, 
                timeSinceLastScan, 
                sequenceWindowMs, 
                lastQuantity,
                reason: `Timeout: ${Math.round(timeSinceLastScan/1000)}s >= ${Math.round(sequenceWindowMs/1000)}s`,
                updatedRef: cumulativeQuantityRef.current 
              })
            }
          } else {
            // First scan - initialize
            cumulativeQuantityRef.current = {
              barcode: cleanBarcode,
              quantity: 1,
              timestamp: saveTimestamp,
            }
            
            logToServer('Cumulative quantity INITIALIZED', { 
              cleanBarcode, 
              initializedRef: cumulativeQuantityRef.current 
            })
          }
          
          // ✅ Get cumulative quantity for display
          const cumulativeQuantity = cumulativeQuantityRef.current?.barcode === cleanBarcode 
            ? cumulativeQuantityRef.current.quantity 
            : 1
          
          logToServer('Final cumulative quantity for display', { 
            cleanBarcode, 
            cumulativeQuantity, 
            currentRef: cumulativeQuantityRef.current, 
            subBadgeText: `(+${cumulativeQuantity})` 
          })
          
          // Determine badge text based on action
          const badgeText = saveResult.action === 'updated' ? 'AŽURIRANO' : 'SKENIRANO'
          // ✅ Show cumulative quantity for same product in sequence (+1, +2, +3...)
          const subBadgeText = saveResult.action === 'updated' 
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
        } else {
          notify.error('Greška pri čuvanju', {
            description: 'Proizvod je pronađen ali nije mogao biti sačuvan. Pokušajte ponovo.',
            duration: 3000,
          })
          // Reset lastScanRef and cumulative quantity on failure to allow retry
          logToServer('RESET: Save failed', { cleanBarcode, reason: 'save_failed' }, 'RESET')
          lastScanRef.current = null
          cumulativeQuantityRef.current = null
        }
      } else {
        // ❌ PRODUCT NOT FOUND: Redirect to Inventory Add Product page
        // ✅ Keep error toast visible (user needs to know why redirect happened)
        notify.error('Proizvod nije pronađen', {
          description: 'Preusmjeravanje na stranicu za dodavanje proizvoda...',
          duration: 3000,
        })
        
        // Close scanner modal
        setScannerOpen(false)
        processingRef.current = false
        setIsProcessing(false)
        
        // ✅ Redirect to Inventory page with barcode as query parameter
        // Using the existing pattern: /inventory?scan=true&sku=...&name=...
        const redirectUrl = `/inventory?scan=true&sku=${encodeURIComponent(cleanBarcode)}`
        router.push(redirectUrl)
        
        // ✅ Update lastScanRef to prevent spam scanning unknown products
        lastScanRef.current = {
          barcode: cleanBarcode,
          timestamp: Date.now(),
        }
      }
    } catch (error) {
      console.error('Error in continuous scan:', error)
      
      notify.error('Greška pri skeniranju', {
        description: 'Neuspešna obrada barkoda. Pokušajte ponovo.',
        duration: 3000,
      })
      // Reset lastScanRef and cumulative quantity on error to allow retry
      logToServer('RESET: Error occurred', { cleanBarcode, error: String(error) }, 'RESET')
      lastScanRef.current = null
      cumulativeQuantityRef.current = null
    } finally {
      // Reset processing state after a brief delay (allows user to see feedback)
      setTimeout(() => {
        processingRef.current = false
        setIsProcessing(false)
      }, 500) // ✅ Faster: 500ms delay for quick scanning of different items
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
