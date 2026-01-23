'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { X, Camera, Flashlight, FlashlightOff, RotateCcw, Volume2, Loader2, SwitchCamera, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'

// EAN-13 Checksum Validation (Luhn Algorithm) - PRESERVED
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

// EAN-8 Checksum Validation (Luhn Algorithm) - PRESERVED
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
  continuousMode?: boolean // If true, scanner stays open after successful scan
}

interface CameraDevice {
  id: string
  label: string
}

export function BarcodeScanner({ open, onClose, onScanSuccess, continuousMode = false }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const lastScanRef = useRef<number>(0)
  const confirmationRef = useRef<{ barcode: string; timestamp: number } | null>(null)
  // ✅ Fast 2-Frame Validation for continuous mode (prevents ghost reads from motion blur)
  const scanBufferRef = useRef<{ barcode: string; count: number } | null>(null)
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout to reset to idle when no barcode detected
  const audioContextRef = useRef<AudioContext | null>(null) // ✅ Reusable AudioContext for reliable beep
  const lastBeepTimeRef = useRef<number>(0) // ✅ Prevent beep spam (minimum 100ms between beeps)
  const originalScrollY = useRef<number>(0)
  const originalBodyStyle = useRef<{
    overflow: string
    position: string
    top: string
    width: string
  } | null>(null)
  const scannerId = 'barcode-scanner-region'
  
  // Store callbacks and props in refs to avoid dependency issues
  const onScanSuccessRef = useRef(onScanSuccess)
  const onCloseRef = useRef(onClose)
  const continuousModeRef = useRef(continuousMode)
  
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess
    onCloseRef.current = onClose
    continuousModeRef.current = continuousMode
  }, [onScanSuccess, onClose, continuousMode])
  
  const [isScanning, setIsScanning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  // ✅ Visual feedback state for "reticle" overlay (idle -> detecting -> success)
  const [scanStatus, setScanStatus] = useState<'idle' | 'detecting' | 'success'>('idle')
  
  // NEW: Zoom controls (critical for S24 macro focus!)
  const [zoomSupported, setZoomSupported] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0)
  const [zoomMin, setZoomMin] = useState<number>(1.0)
  const [zoomMax, setZoomMax] = useState<number>(1.0)
  const [zoomStep, setZoomStep] = useState<number>(0.1)

  // ✅ Improved beep sound - reliable playback for every successful scan
  const playBeep = async () => {
    if (!soundEnabled) {
      console.log('🔇 Beep disabled by user')
      return
    }
    
    // ✅ Prevent beep spam (minimum 100ms between beeps)
    const now = Date.now()
    if (now - lastBeepTimeRef.current < 100) {
      console.log('⏸️ Beep throttled (too soon)')
      return
    }
    lastBeepTimeRef.current = now
    
    try {
      // ✅ Reuse AudioContext or create new one if needed
      let audioContext = audioContextRef.current
      
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext
      }
      
      // ✅ Resume AudioContext if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
        console.log('🔊 AudioContext resumed')
      }
      
      // ✅ Create new oscillator for each beep (prevents conflicts)
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      // ✅ Clear, audible beep (slightly longer for better audibility)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.15)
      
      console.log('🔊 Beep played successfully')
    } catch (err) {
      console.error('❌ Could not play beep:', err)
      // ✅ Fallback: Try to recreate AudioContext on next attempt
      audioContextRef.current = null
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

  // NEW: Handle zoom change (critical for macro focus!)
  const handleZoomChange = async (value: number[]) => {
    if (!videoTrackRef.current || !zoomSupported) return
    
    const newZoom = value[0]
    setZoomLevel(newZoom)
    
    try {
      await videoTrackRef.current.applyConstraints({
        advanced: [{ zoom: newZoom } as any]
      })
      console.log(`🔍 Zoom adjusted: ${newZoom.toFixed(1)}x`)
    } catch (err) {
      console.error('Failed to adjust zoom:', err)
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
    confirmationRef.current = null
    scanBufferRef.current = null // ✅ Reset scan buffer on stop
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    // ✅ Cleanup AudioContext on stop (optional - can keep it for faster beeps)
    // audioContextRef.current?.close().catch(() => {})
    // audioContextRef.current = null
    lastBeepTimeRef.current = 0 // ✅ Reset beep throttle
    setScanStatus('idle') // ✅ Reset visual feedback on stop
    
    // Reset UI state
    setIsScanning(false)
    setIsLoading(false)
    setTorchEnabled(false)
    setZoomLevel(1.0)
    
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

  // ✅ Initialize AudioContext on first user interaction (unlock browser audio)
  const initializeAudio = () => {
    if (!audioContextRef.current && soundEnabled) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext
        // ✅ Resume immediately to unlock audio (browser autoplay policy)
        audioContext.resume().catch(() => {
          // Silent fail - will retry on first beep
        })
        console.log('🔊 AudioContext initialized')
      } catch (err) {
        console.warn('Could not initialize AudioContext:', err)
      }
    }
  }

  // Load available cameras
  const loadCameras = async () => {
    setIsLoading(true)
    setError(null)
    
    // ✅ Initialize audio when scanner opens (user interaction)
    initializeAudio()
    
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
    scanBufferRef.current = null // ✅ Reset scan buffer on start
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    setScanStatus('idle') // ✅ Reset visual feedback on start
    
    try {
      console.log(`🚀 Starting OPTIMIZED scanner with camera: ${cameraId}`)
      
      // ✨ OPTIMIZATION 1: Enable Native Barcode Detector (THE SILVER BULLET!)
      const scanner = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        // ⭐ CRITICAL: Force Native Barcode Detector (Google Play Services on Android!)
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // AI-powered sharpening & error correction!
        }
      })
      
      scannerRef.current = scanner
      
      // ✨ OPTIMIZATION 2 & 3: High Resolution + Advanced Constraints
      const isContinuous = continuousModeRef.current
      const config = {
        fps: isContinuous ? 10 : 5, // ✅ Higher FPS (10) for continuous mode, lower (5) for single scan
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment',
          focusMode: 'continuous', // Continuous autofocus
          // 🔥 HIGH RESOLUTION: More pixels = more detail for decoder!
          width: { min: 1024, ideal: 1920, max: 3840 },
          height: { min: 576, ideal: 1080, max: 2160 },
          advanced: [
            { zoom: 1.0 }, // Will be adjusted via slider
          ] as any
        }
      }
      
      console.log('📸 Requesting FULL HD (1920x1080) with Native Detector!')
      
      // Start scanning
      await scanner.start(
        cameraId,
        config,
        (decodedText, decodedResult) => {
          const now = Date.now()
          
          // ✅ OPTIMIZED DEBOUNCE: Shorter for continuous mode (100ms) vs single scan (200ms)
          const isContinuous = continuousModeRef.current
          const debounceMs = isContinuous ? 100 : 200
          if (now - lastScanRef.current < debounceMs) {
            return
          }
          lastScanRef.current = now
          
          const formatName = decodedResult.result?.format?.formatName || 'UNKNOWN'
          
          // PRESERVED: STRICT Checksum Validation (SILENT REJECT if fails!)
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
          
          // ✅ CONTINUOUS MODE: Fast 2-Frame Validation (prevents ghost reads from motion blur)
          if (isContinuous) {
            const buffer = scanBufferRef.current
            
            // Clear any existing idle timeout (barcode detected)
            if (idleTimeoutRef.current) {
              clearTimeout(idleTimeoutRef.current)
              idleTimeoutRef.current = null
            }
            
            // Check if this matches the previous scan
            if (buffer && buffer.barcode === decodedText) {
              // Same code detected again - increment counter
              buffer.count += 1
              
              // ✅ VALIDATION: Only emit if we've seen this code in 2 consecutive frames
              if (buffer.count >= 2) {
                console.log(`✅✅ Continuous mode: Validated (${buffer.count} frames) - ${decodedText}`)
                
                // ✅ Visual feedback: Success (green flash)
                setScanStatus('success')
                
                // ✅ Only beep and emit when validated (prevents false positives)
                // ✅ Play beep asynchronously to ensure it's not blocked
                playBeep().catch(err => {
                  console.warn('Beep playback failed:', err)
                })
                onScanSuccessRef.current(decodedText)
                
                // Reset buffer for next scan (allow new code to be detected)
                scanBufferRef.current = null
                // Reset debounce timer for next scan
                lastScanRef.current = now
                
                // Reset to idle after brief success flash (500ms)
                setTimeout(() => {
                  setScanStatus('idle')
                  // Set timeout to reset to idle if no barcode detected for 1 second
                  idleTimeoutRef.current = setTimeout(() => {
                    setScanStatus('idle')
                  }, 1000)
                }, 500)
              } else {
                // Not enough frames yet - wait for more
                // ✅ Visual feedback: Still detecting (keep yellow)
                setScanStatus('detecting')
                console.log(`⏳ Continuous mode: Frame ${buffer.count}/2 - ${decodedText}`)
              }
            } else {
              // Different code or first detection - reset buffer
              scanBufferRef.current = {
                barcode: decodedText,
                count: 1,
              }
              // ✅ Visual feedback: First frame detected (yellow)
              setScanStatus('detecting')
              console.log(`📊 Continuous mode: First frame detected - ${decodedText}`)
            }
            
            return // Don't proceed to double-scan logic
          }
          
          // ✅ SINGLE SCAN MODE: Double-scan confirmation (Anti-Blur Protection!)
          const previousScan = confirmationRef.current
          
          // Check if we have a previous scan within last 2 seconds
          if (previousScan && (now - previousScan.timestamp < 2000)) {
            // Check if SAME barcode
            if (previousScan.barcode === decodedText) {
              // ✅ CONFIRMED! Same barcode scanned twice - HIGH CONFIDENCE!
              console.log(`✅✅ CONFIRMED! Barcode validated twice: ${decodedText}`)
              
              // ✅ Visual feedback: Success (green flash)
              setScanStatus('success')
              
              // ✅ Play beep asynchronously to ensure it's not blocked
              playBeep().catch(err => {
                console.warn('Beep playback failed:', err)
              })
              toast.success(`Barcode confirmed: ${decodedText}`)
              
              // Reset confirmation
              confirmationRef.current = null
              
              // Notify parent
              onScanSuccessRef.current(decodedText)
              
              // Stop scanner (single scan mode)
              stopScanning()
            } else {
              // ⚠️ DIFFERENT barcode - reset and start fresh
              console.log(`⚠️ Different barcode detected. Previous: ${previousScan.barcode}, New: ${decodedText}`)
              confirmationRef.current = { barcode: decodedText, timestamp: now }
              // ✅ Visual feedback: Detecting (yellow)
              setScanStatus('detecting')
              toast.info('Hold steady... confirming scan')
            }
          } else {
            // First scan or timeout - save and wait for confirmation
            console.log(`📊 First scan detected: ${decodedText} (${formatName}) - waiting for confirmation...`)
            confirmationRef.current = { barcode: decodedText, timestamp: now }
            // ✅ Visual feedback: Detecting (yellow)
            setScanStatus('detecting')
            toast.info('Hold steady... confirming scan')
          }
        },
        (errorMessage) => {
          // SILENT - normal scanning errors (no barcode found)
        }
      )
      
      // ✨ OPTIMIZATION 3: Setup zoom controls (CRITICAL for S24 macro!)
      setTimeout(() => {
        const videoElement = document.getElementById(scannerId)?.querySelector('video')
        if (videoElement?.srcObject) {
          const stream = videoElement.srcObject as MediaStream
          const videoTrack = stream.getVideoTracks()[0]
          
          if (videoTrack) {
            videoTrackRef.current = videoTrack
            
            const capabilities = videoTrack.getCapabilities() as any
            
            // Check torch support
            if (capabilities?.torch) {
              setTorchSupported(true)
              console.log('🔦 Torch supported')
            }
            
            // 🔍 NEW: Check zoom support & setup default zoom!
            if (capabilities?.zoom) {
              const min = capabilities.zoom.min || 1.0
              const max = capabilities.zoom.max || 1.0
              const step = capabilities.zoom.step || 0.1
              
              setZoomSupported(true)
              setZoomMin(min)
              setZoomMax(max)
              setZoomStep(step)
              
              // 🎯 CRITICAL: Default to 1.5x-2.0x zoom (acts as "macro mode"!)
              const defaultZoom = Math.min(2.0, max) // Prefer 2.0x if available
              setZoomLevel(defaultZoom)
              
              // Apply default zoom immediately!
              videoTrack.applyConstraints({
                advanced: [{ zoom: defaultZoom } as any]
              }).then(() => {
                console.log(`🔍 Zoom supported! Range: ${min}-${max}, Default: ${defaultZoom.toFixed(1)}x (Macro Mode!)`)
              }).catch(err => {
                console.warn('Could not apply default zoom:', err)
              })
            }
            
            const settings = videoTrack.getSettings()
            console.log(`📷 Actual Resolution: ${settings.width}x${settings.height}`)
            console.log(`🎯 Using Native Barcode Detector: ${typeof (window as any).BarcodeDetector !== 'undefined'}`)
          }
        }
      }, 500)
      
      setIsLoading(false)
      setIsScanning(true)
      console.log('✅ OPTIMIZED scanner active with Native Detector + HD + Zoom!')
      
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
      }, 50)
      
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
                Scan Barcode (Optimized HD)
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {zoomSupported && 'Use zoom slider for difficult barcodes • '}
                Position barcode within the box
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

            {/* ✅ Visual Reticle Overlay (Aiming Feedback) */}
            {isScanning && !error && !isLoading && (
              <div 
                className={`absolute inset-0 pointer-events-none z-25 transition-all duration-200 ${
                  scanStatus === 'idle' 
                    ? 'border-4 border-white/50' 
                    : scanStatus === 'detecting' 
                    ? 'border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]' 
                    : 'border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.7)]'
                }`}
                style={{
                  borderRadius: '8px',
                }}
              >
                {/* Status Badge (Top Center) */}
                {scanStatus === 'detecting' && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-400/90 text-yellow-900 px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                    Detecting...
                  </div>
                )}
                {scanStatus === 'success' && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    ✓ Scanned
                  </div>
                )}
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-white text-lg font-medium">Starting Camera...</p>
                  <p className="text-gray-400 text-sm">Initializing HD scanner with AI detection...</p>
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

            {/* Control Buttons (Top Right) */}
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

            {/* NEW: Zoom Slider (Top Left) - CRITICAL for S24 Macro! */}
            {isScanning && zoomSupported && (
              <div className="absolute top-4 left-4 z-30 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <ZoomIn className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Zoom: {zoomLevel.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[zoomLevel]}
                  onValueChange={handleZoomChange}
                  min={zoomMin}
                  max={zoomMax}
                  step={zoomStep}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust for difficult/blurry codes
                </p>
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
                    Initializing HD scanner...
                  </span>
                ) : isScanning ? (
                  <span className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    HD Scanner active • Native AI detection enabled
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
          display: none !important;
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
