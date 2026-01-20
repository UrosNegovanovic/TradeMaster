'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Camera, Flashlight, FlashlightOff, RotateCcw, Volume2, Loader2, SwitchCamera } from 'lucide-react'
import { toast } from 'sonner'

// EAN-13 Checksum Validation (Luhn Algorithm)
function validateEAN13Checksum(barcode: string): boolean {
  if (barcode.length !== 13 || !/^\d+$/.test(barcode)) {
    return false
  }
  
  const digits = barcode.split('').map(Number)
  const checkDigit = digits[12]
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

// EAN-8 Checksum Validation (Luhn Algorithm)
function validateEAN8Checksum(barcode: string): boolean {
  if (barcode.length !== 8 || !/^\d+$/.test(barcode)) {
    return false
  }
  
  const digits = barcode.split('').map(Number)
  const checkDigit = digits[7]
  
  let sum = 0
  for (let i = 0; i < 7; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1)
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScanSuccess: (barcode: string) => void
}

interface CameraDevice {
  id: string
  label: string
}

export function BarcodeScanner({ open, onClose, onScanSuccess }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const lastScanRef = useRef<number>(0)
  const confirmationRef = useRef<{ barcode: string; timestamp: number } | null>(null)
  const originalScrollY = useRef<number>(0)
  const originalBodyStyle = useRef<{
    overflow: string
    position: string
    top: string
    width: string
  } | null>(null)
  const scannerId = 'barcode-scanner-region'
  
  // Store callbacks in refs to avoid dependency issues
  const onScanSuccessRef = useRef(onScanSuccess)
  const onCloseRef = useRef(onClose)
  
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess
    onCloseRef.current = onClose
  }, [onScanSuccess, onClose])
  
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Play beep sound on successful scan
  const playBeep = () => {
    if (!soundEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (err) {
      console.warn('Could not play beep:', err)
    }
  }

  // Toggle torch (flashlight)
  const toggleTorch = async () => {
    if (!videoTrackRef.current) return
    
    try {
      const track = videoTrackRef.current
      const capabilities = track.getCapabilities() as any
      
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any]
        })
        setTorchEnabled(!torchEnabled)
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err)
      toast.error('Could not toggle flashlight')
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // SAFETY: Force unlock scroll on component unmount (navigation, etc.)
  useEffect(() => {
    return () => {
      // Final cleanup - always unlock scroll when component is destroyed!
      document.body.style.overflow = 'auto'
      document.body.style.position = 'relative'
      document.body.style.top = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = 'auto'
      
      console.log('🔓 FINAL CLEANUP: Scroll unlocked on component unmount!')
    }
  }, [])

  const handleClose = () => {
    stopScanning()
    onCloseRef.current()
  }

  const handleRetry = () => {
    setError(null)
    loadCameras()
  }

  // Stop scanner and cleanup
  const stopScanning = async () => {
    console.log('🛑 Stopping scanner...')
    
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop()
          console.log('✅ Scanner stopped')
        }
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      
      try {
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Error clearing scanner:', err)
      }
      
      scannerRef.current = null
    }
    
    videoTrackRef.current = null
    confirmationRef.current = null // Reset confirmation state
    
    // Reset UI state
    setIsScanning(false)
    setIsLoading(false)
    setTorchEnabled(false)
    
    // BULLETPROOF: Restore body scroll (iOS + Android compatible!)
    if (originalBodyStyle.current) {
      requestAnimationFrame(() => {
        document.body.style.overflow = originalBodyStyle.current?.overflow || ''
        document.body.style.position = originalBodyStyle.current?.position || ''
        document.body.style.top = originalBodyStyle.current?.top || ''
        document.body.style.width = originalBodyStyle.current?.width || ''
        document.documentElement.style.overflow = ''
        
        // Restore scroll position (iOS fix!)
        if (originalScrollY.current > 0) {
          window.scrollTo(0, originalScrollY.current)
        }
        
        console.log('✅ Scroll restored:', {
          scrollY: originalScrollY.current,
          bodyOverflow: document.body.style.overflow
        })
      })
    }
    
    console.log('✅ Scanner cleanup complete')
  }

  // Load available cameras
  const loadCameras = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('📷 Loading available cameras...')
      
      // BULLETPROOF: Save original scroll position and body styles
      originalScrollY.current = window.scrollY
      originalBodyStyle.current = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width
      }
      
      console.log('💾 Saved scroll state:', {
        scrollY: originalScrollY.current,
        bodyOverflow: originalBodyStyle.current.overflow
      })
      
      // Prevent body scroll on mobile (iOS + Android fix!)
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${originalScrollY.current}px`
      document.body.style.width = '100%'
      document.documentElement.style.overflow = 'hidden'
      
      const devices = await Html5Qrcode.getCameras()
      
      if (!devices || devices.length === 0) {
        throw new Error('No cameras found on this device')
      }
      
      const cameraList: CameraDevice[] = devices.map(device => ({
        id: device.id,
        label: device.label || `Camera ${devices.indexOf(device) + 1}`
      }))
      
      setCameras(cameraList)
      
      // Auto-select rear camera (environment) or first available
      const rearCamera = cameraList.find(cam => 
        cam.label.toLowerCase().includes('back') || 
        cam.label.toLowerCase().includes('rear') ||
        cam.label.toLowerCase().includes('environment')
      )
      
      const defaultCamera = rearCamera || cameraList[0]
      setSelectedCamera(defaultCamera.id)
      
      console.log(`📷 Found ${cameraList.length} camera(s)`)
      console.log(`✅ Selected: ${defaultCamera.label}`)
      
      // Auto-start with selected camera
      await startScanning(defaultCamera.id)
      
    } catch (err: any) {
      console.error('❌ Camera initialization failed:', err)
      setIsLoading(false)
      
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        setError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError' || err.message?.includes('No cameras')) {
        setError('No camera found on this device.')
      } else {
        setError(`Failed to access camera: ${err.message || 'Unknown error'}`)
      }
    }
  }

  // Start scanning with selected camera
  const startScanning = async (cameraId: string) => {
    setIsLoading(true)
    setError(null)
    lastScanRef.current = 0
    
    try {
      console.log(`🚀 Starting scanner with camera: ${cameraId}`)
      
      // Create scanner instance
      const scanner = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]
      })
      
      scannerRef.current = scanner
      
      // Samsung S24 Optimized Configuration (ANTI-BLUR UPDATE!)
      const config = {
        fps: 5, // REDUCED from 10 to 5 - gives camera MORE time to focus!
        qrbox: { width: 250, height: 250 }, // Scanning region (helps with focus feedback)
        aspectRatio: 1.0, // Square box for better barcode alignment
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment',
          focusMode: 'continuous', // Continuous autofocus (critical for S24!)
          advanced: [
            { zoom: 1.0 }, // No zoom by default
          ] as any
        }
      }
      
      // Start scanning
      await scanner.start(
        cameraId,
        config,
        (decodedText, decodedResult) => {
          const now = Date.now()
          
          // Quick debounce (prevent spam within 200ms)
          if (now - lastScanRef.current < 200) {
            return
          }
          lastScanRef.current = now
          
          const formatName = decodedResult.result?.format?.formatName || 'UNKNOWN'
          
          // STRICT Checksum Validation (SILENT REJECT if fails!)
          const format = formatName
          
          if (format === 'EAN_13') {
            if (!validateEAN13Checksum(decodedText)) {
              console.warn(`❌ Invalid EAN-13 checksum: ${decodedText} - SILENTLY IGNORING`)
              return // SILENT REJECT - keep scanning!
            }
          }
          
          if (format === 'EAN_8') {
            if (!validateEAN8Checksum(decodedText)) {
              console.warn(`❌ Invalid EAN-8 checksum: ${decodedText} - SILENTLY IGNORING`)
              return // SILENT REJECT - keep scanning!
            }
          }
          
          // ✨ NEW: DOUBLE-SCAN CONFIRMATION (Anti-Blur Protection!)
          const previousScan = confirmationRef.current
          
          // Check if we have a previous scan within last 2 seconds
          if (previousScan && (now - previousScan.timestamp < 2000)) {
            // Check if SAME barcode
            if (previousScan.barcode === decodedText) {
              // ✅ CONFIRMED! Same barcode scanned twice - HIGH CONFIDENCE!
              console.log(`✅✅ CONFIRMED! Barcode validated twice: ${decodedText}`)
              
              playBeep()
              toast.success(`Barcode confirmed: ${decodedText}`)
              
              // Reset confirmation
              confirmationRef.current = null
              
              // Stop scanner and notify parent
              stopScanning()
              onScanSuccessRef.current(decodedText)
            } else {
              // ⚠️ DIFFERENT barcode - reset and start fresh
              console.log(`⚠️ Different barcode detected. Previous: ${previousScan.barcode}, New: ${decodedText}`)
              confirmationRef.current = { barcode: decodedText, timestamp: now }
              toast.info('Hold steady... confirming scan')
            }
          } else {
            // First scan or timeout - save and wait for confirmation
            console.log(`📊 First scan detected: ${decodedText} (${formatName}) - waiting for confirmation...`)
            confirmationRef.current = { barcode: decodedText, timestamp: now }
            toast.info('Hold steady... confirming scan')
          }
        },
        (errorMessage) => {
          // SILENT - normal scanning errors (no barcode found)
          // Don't log to avoid console spam
        }
      )
      
      // Get video track for torch support
      setTimeout(() => {
        const videoElement = document.getElementById(scannerId)?.querySelector('video')
        if (videoElement?.srcObject) {
          const stream = videoElement.srcObject as MediaStream
          const videoTrack = stream.getVideoTracks()[0]
          
          if (videoTrack) {
            videoTrackRef.current = videoTrack
            
            const capabilities = videoTrack.getCapabilities() as any
            if (capabilities?.torch) {
              setTorchSupported(true)
              console.log('🔦 Torch supported')
            }
            
            const settings = videoTrack.getSettings()
            console.log(`📷 Resolution: ${settings.width}x${settings.height}`)
          }
        }
      }, 500)
      
      setIsLoading(false)
      setIsScanning(true)
      console.log('✅ Scanner active!')
      
    } catch (err: any) {
      console.error('❌ Scanner start failed:', err)
      setIsLoading(false)
      setError(`Failed to start scanner: ${err.message || 'Unknown error'}`)
    }
  }

  // Handle camera change
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId)
    await stopScanning()
    await startScanning(cameraId)
  }

  // Initialize when dialog opens
  useEffect(() => {
    if (!open) {
      // AGGRESSIVE: Force scroll unlock when dialog closes!
      stopScanning()
      setError(null)
      setCameras([])
      setSelectedCamera('')
      
      // FORCE UNLOCK SCROLL (even if stopScanning didn't do it!)
      setTimeout(() => {
        if (originalBodyStyle.current) {
          document.body.style.overflow = originalBodyStyle.current.overflow || 'auto'
          document.body.style.position = originalBodyStyle.current.position || 'relative'
          document.body.style.top = originalBodyStyle.current.top || ''
          document.body.style.width = originalBodyStyle.current.width || ''
          
          if (originalScrollY.current > 0) {
            window.scrollTo(0, originalScrollY.current)
          }
          
          console.log('🔓 FORCE UNLOCKED scroll on dialog close!')
        } else {
          // Fallback: Just unlock everything!
          document.body.style.overflow = 'auto'
          document.body.style.position = 'relative'
          document.body.style.top = ''
          document.body.style.width = ''
          document.documentElement.style.overflow = 'auto'
          
          console.log('🔓 FORCE UNLOCKED (fallback)!')
        }
      }, 50) // Small delay to override Dialog's cleanup
      
      return
    }

    loadCameras()

    return () => {
      stopScanning()
      
      // CLEANUP: Force unlock on unmount!
      setTimeout(() => {
        document.body.style.overflow = 'auto'
        document.body.style.position = 'relative'
        document.body.style.top = ''
        document.body.style.width = ''
        document.documentElement.style.overflow = 'auto'
        
        console.log('🔓 Cleanup: Force unlocked on unmount!')
      }, 50)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Scan Barcode
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                Position the barcode within the scanning box
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scanner Container */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {/* Scanner Region */}
          <div className="absolute inset-0">
            <div 
              id={scannerId} 
              className="w-full h-full"
              style={{
                display: isLoading || error ? 'none' : 'block'
              }}
            />

            {/* Loading Overlay */}
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-white text-lg font-medium">Starting Camera...</p>
                  <p className="text-gray-400 text-sm">Initializing scanner...</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-4 z-20 bg-black">
                <div className="text-center space-y-4">
                  <div className="text-red-500 text-lg font-medium">{error}</div>
                  <Button onClick={handleRetry} variant="default">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            {isScanning && !error && (
              <div className="absolute top-4 right-4 flex flex-col gap-3 z-30">
                {/* Torch Toggle */}
                {torchSupported && (
                  <Button
                    variant="default"
                    size="icon"
                    onClick={toggleTorch}
                    className="h-12 w-12 rounded-full shadow-lg"
                    title="Toggle Flashlight"
                  >
                    {torchEnabled ? (
                      <FlashlightOff className="h-5 w-5" />
                    ) : (
                      <Flashlight className="h-5 w-5" />
                    )}
                  </Button>
                )}
                
                {/* Sound Toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-12 w-12 rounded-full shadow-lg bg-background"
                  title="Toggle Beep Sound"
                >
                  <Volume2 className={`h-5 w-5 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            )}

            {/* Camera Selector (Bottom Center) */}
            {isScanning && cameras.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                <Select value={selectedCamera} onValueChange={handleCameraChange}>
                  <SelectTrigger className="w-[200px] bg-background/90 backdrop-blur-sm">
                    <SwitchCamera className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map(camera => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 border-t bg-background flex-shrink-0 z-20">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <div className="flex-1 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                {isLoading ? (
                  <span className="flex items-center justify-center sm:justify-start gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Initializing scanner...
                  </span>
                ) : isScanning ? (
                  <span className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Scanner active - Align barcode in box
                  </span>
                ) : (
                  'Ready to scan'
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Global CSS Override for html5-qrcode */}
      <style jsx global>{`
        /* Style the html5-qrcode video container */
        #${scannerId} {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        #${scannerId} > div {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        #${scannerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        
        /* Style the scanning box */
        #${scannerId} canvas {
          display: none !important; /* Hide the overlay canvas, keep video clean */
        }
        
        /* Custom scanning box border */
        #${scannerId}__scan_region {
          border: 3px solid hsl(var(--primary)) !important;
          border-radius: 8px !important;
        }
        
        /* Hide default file upload UI */
        #${scannerId}__dashboard_section_csr {
          display: none !important;
        }
      `}</style>
    </Dialog>
  )
}
