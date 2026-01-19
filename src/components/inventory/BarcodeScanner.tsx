'use client'

import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Camera } from 'lucide-react'
import { toast } from 'sonner'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScanSuccess: (barcode: string) => void
}

export function BarcodeScanner({ open, onClose, onScanSuccess }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const barcode = result[0].rawValue
      setIsScanning(false)
      onScanSuccess(barcode)
      onClose()
    }
  }

  const handleError = (error: any) => {
    console.error('Scanner error:', error)
    
    // Handle camera permission errors
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      setError('Camera permission denied. Please enable camera access in your browser settings.')
      toast.error('Camera access denied', {
        description: 'Please allow camera permissions to scan barcodes.',
      })
    } else if (error?.name === 'NotFoundError') {
      setError('No camera found on this device.')
      toast.error('No camera found', {
        description: 'Please connect a camera to use the barcode scanner.',
      })
    } else {
      setError('Failed to access camera. Please try again.')
      toast.error('Scanner error', {
        description: 'Unable to start the camera. Please try again.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
                    Point your camera at a product barcode (EAN-13, UPC)
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Scanner Area */}
          <div className="flex-1 flex items-center justify-center bg-black p-4 sm:p-6">
            {error ? (
              <div className="text-center space-y-4">
                <div className="text-red-500 text-lg font-medium">{error}</div>
                <Button onClick={() => {
                  setError(null)
                  setIsScanning(true)
                }}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-lg aspect-square sm:aspect-video relative">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    facingMode: 'environment',
                  }}
                  formats={[
                    'qr_code',
                    'ean_13',
                    'ean_8',
                    'upc_a',
                    'upc_e',
                    'code_128',
                    'code_39',
                  ]}
                  components={{
                    torch: true,
                    zoom: false,
                    finder: true,
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '100%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    },
                    video: {
                      objectFit: 'cover',
                    },
                  }}
                />
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-3/4 sm:w-1/2 h-24 sm:h-32 border-2 border-primary rounded-lg relative">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t bg-background">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <div className="flex-1 text-xs sm:text-sm text-muted-foreground text-center sm:text-left flex items-center justify-center sm:justify-start">
                Position the barcode within the frame to scan automatically
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
