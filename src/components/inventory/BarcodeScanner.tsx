'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Camera, Flashlight, FlashlightOff, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScanSuccess: (barcode: string) => void
}

export function BarcodeScanner({ open, onClose, onScanSuccess }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerElementId = 'barcode-scanner-container'
  const lastScanTimeRef = useRef<number>(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [lastScanAttempt, setLastScanAttempt] = useState<number>(Date.now())

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    
    scannerRef.current = null
    setIsScanning(false)
    setTorchEnabled(false)
  }, [])

  // Initialize scanner
  const initializeScanner = useCallback(async () => {
    if (!open) return

    setError(null)
    
    try {
      // Create scanner instance with optimized config for 1D barcodes
      const scanner = new Html5Qrcode(scannerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E, // Optional but useful
        ],
        verbose: false,
      })

      scannerRef.current = scanner

      // Check torch support
      const cameras = await Html5Qrcode.getCameras()
      const backCamera = cameras.find((cam) => cam.label.toLowerCase().includes('back'))
      
      // Start scanning with optimized configuration
      await scanner.start(
        backCamera?.id || { facingMode: 'environment' },
        {
          fps: 20, // High FPS for smoother detection
          qrbox: { width: 300, height: 150 }, // Optimized for 1D barcodes (wide but short)
          aspectRatio: 1.77, // 16:9 aspect ratio to prevent stretching
          disableFlip: false, // Allow horizontal flip for mirrored barcodes
        },
        async (decodedText, decodedResult) => {
          // Debounce scans (prevent duplicate scans within 2 seconds)
          const now = Date.now()
          if (now - lastScanTimeRef.current < 2000) {
            return
          }
          lastScanTimeRef.current = now

          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }

          // Success feedback
          toast.success('Barcode scanned!', {
            description: `Code: ${decodedText}`,
            duration: 2000,
          })

          // Stop scanner and trigger success callback
          await cleanup()
          onScanSuccess(decodedText)
          onClose()
        },
        (errorMessage) => {
          // Silently handle decode errors (normal when no barcode in frame)
          // Only log if it's not a typical "No code found" error
          if (!errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scan error:', errorMessage)
          }
          
          // Update last scan attempt timestamp
          setLastScanAttempt(Date.now())
        }
      )

      setIsScanning(true)

      // Check if torch is supported
      const capabilities = scanner.getRunningTrackCameraCapabilities()
      if (capabilities && (capabilities as any).torch) {
        setTorchSupported(true)
      }

    } catch (err: any) {
      console.error('Scanner initialization error:', err)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please enable camera access in your browser settings.')
        toast.error('Camera access denied', {
          description: 'Please allow camera permissions to scan barcodes.',
        })
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
        toast.error('No camera found', {
          description: 'Please connect a camera to use the barcode scanner.',
        })
      } else if (err.message?.includes('NotAllowedError')) {
        setError('Camera is blocked. Please check your browser permissions.')
        toast.error('Camera blocked', {
          description: 'Allow camera access to scan barcodes.',
        })
      } else {
        setError('Failed to access camera. Please try again.')
        toast.error('Scanner error', {
          description: err.message || 'Unable to start the camera.',
        })
      }
    }
  }, [open, onClose, onScanSuccess, cleanup])

  // Toggle torch/flashlight
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !torchSupported) return

    try {
      const newTorchState = !torchEnabled
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorchState } as any],
      })
      setTorchEnabled(newTorchState)
      toast.success(newTorchState ? 'Flashlight ON' : 'Flashlight OFF')
    } catch (err) {
      console.error('Torch toggle error:', err)
      toast.error('Failed to toggle flashlight')
    }
  }, [torchEnabled, torchSupported])

  // Retry/refocus logic - restart scanner if no successful scan for 3+ seconds
  useEffect(() => {
    if (!isScanning) return

    retryTimeoutRef.current = setInterval(() => {
      const timeSinceLastAttempt = Date.now() - lastScanAttempt
      
      // If no scan for more than 3 seconds, show hint
      if (timeSinceLastAttempt > 3000 && timeSinceLastAttempt < 3500) {
        toast.info('Position the barcode in the frame', {
          description: 'Make sure the barcode is clear and well-lit.',
          duration: 2000,
        })
      }
    }, 500)

    return () => {
      if (retryTimeoutRef.current) {
        clearInterval(retryTimeoutRef.current)
      }
    }
  }, [isScanning, lastScanAttempt])

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (open) {
      initializeScanner()
    } else {
      cleanup()
    }

    return () => {
      cleanup()
    }
  }, [open, initializeScanner, cleanup])

  const handleRetry = () => {
    setError(null)
    cleanup().then(() => {
      initializeScanner()
    })
  }

  const handleClose = () => {
    cleanup()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl w-full max-w-full h-[90vh] sm:h-auto p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <div>
                  <DialogTitle>Scan Barcode</DialogTitle>
                  <DialogDescription className="mt-1">
                    Position the barcode in the center frame (EAN-13, UPC-A, EAN-8)
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Scanner Area */}
          <div className="flex-1 flex items-center justify-center bg-black p-4 sm:p-6 relative">
            {error ? (
              <div className="text-center space-y-4">
                <div className="text-red-500 text-lg font-medium">{error}</div>
                <Button onClick={handleRetry} variant="default">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* Scanner Container */}
                <div 
                  id={scannerElementId}
                  className="w-full max-w-lg aspect-[4/3] relative"
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                />

                {/* Scanner Overlay with Guide */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Dark overlay with transparent center */}
                    <div className="absolute inset-0 bg-black/50" />
                    
                    {/* Transparent box for barcode placement */}
                    <div className="relative z-10 w-[300px] h-[150px] border-2 border-primary rounded-lg shadow-lg">
                      {/* Corner markers */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary" />
                      
                      {/* Animated scanning line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan-line" />
                    </div>

                    {/* Instruction text */}
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                      <p className="text-white text-sm font-medium bg-black/70 inline-block px-4 py-2 rounded-full">
                        Align barcode within the frame
                      </p>
                    </div>
                  </div>
                )}

                {/* Torch/Flashlight Toggle */}
                {torchSupported && isScanning && (
                  <Button
                    variant="default"
                    size="icon"
                    onClick={toggleTorch}
                    className="absolute bottom-24 right-6 pointer-events-auto z-20 h-14 w-14 rounded-full shadow-lg"
                  >
                    {torchEnabled ? (
                      <FlashlightOff className="h-6 w-6" />
                    ) : (
                      <Flashlight className="h-6 w-6" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t bg-background">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <div className="flex-1 text-xs sm:text-sm text-muted-foreground text-center sm:text-left flex items-center justify-center sm:justify-start">
                {isScanning ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Scanner active - Position barcode in the center
                  </>
                ) : (
                  'Initializing scanner...'
                )}
              </div>
              {torchSupported && (
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Flashlight className="h-3 w-3" />
                  Flashlight available
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Custom CSS for scanning animation */}
      <style jsx>{`
        @keyframes scan-line {
          0% {
            top: 10%;
          }
          50% {
            top: 90%;
          }
          100% {
            top: 10%;
          }
        }
        
        :global(.animate-scan-line) {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </Dialog>
  )
}
