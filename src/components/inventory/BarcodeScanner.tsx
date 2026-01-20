'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Camera, Flashlight, FlashlightOff, RotateCcw, Volume2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// #region agent log - Mobile Detection Helper
/**
 * Detect if running on mobile device (for optimizations)
 */
function isMobileDevice(): boolean {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  // #region agent log - Debug log
  fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:18',message:'Mobile device detected',data:{isMobile,userAgent:userAgent.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'mobile-detection'})}).catch(()=>{});
  // #endregion
  return isMobile
}
// #endregion

// #region agent log - EAN-13 Checksum Validation
/**
 * Validate EAN-13 barcode checksum (prevents false positives)
 * Algorithm: https://en.wikipedia.org/wiki/International_Article_Number
 */
function validateEAN13Checksum(barcode: string): boolean {
  if (barcode.length !== 13 || !/^\d+$/.test(barcode)) {
    return false
  }
  
  const digits = barcode.split('').map(Number)
  const checkDigit = digits[12]
  
  // Calculate checksum: sum odd positions (1x) + even positions (3x)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  const isValid = calculatedCheck === checkDigit
  
  // #region agent log - Debug log
  fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:46',message:'EAN-13 checksum validation',data:{barcode,isValid,calculated:calculatedCheck,expected:checkDigit},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'checksum-validation'})}).catch(()=>{});
  // #endregion
  
  return isValid
}
// #endregion

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScanSuccess: (barcode: string) => void
}

export function BarcodeScanner({ open, onClose, onScanSuccess }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isScanningRef = useRef<boolean>(false)
  const lastScanRef = useRef<number>(0)
  const autoFocusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Store callbacks in refs to avoid dependency issues
  const onCloseRef = useRef(onClose)
  const onScanSuccessRef = useRef(onScanSuccess)
  
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [cameraInfo, setCameraInfo] = useState<string>('')
  const [debugMode, setDebugMode] = useState(false)

  // Update refs when props change
  useEffect(() => {
    onCloseRef.current = onClose
    onScanSuccessRef.current = onScanSuccess
  }, [onClose, onScanSuccess])

  // Robust stop/cleanup function
  const stopScanning = () => {
    console.log('🛑 Stopping scanner...')
    
    // Clear auto-focus interval
    if (autoFocusIntervalRef.current) {
      clearInterval(autoFocusIntervalRef.current)
      autoFocusIntervalRef.current = null
    }

    // Stop scanning flag
    isScanningRef.current = false
    
    // Reset debounce timer (CRITICAL FIX: Allow rescanning same barcode)
    lastScanRef.current = 0
    
    // Stop and reset code reader
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset()
        console.log('✅ Code reader reset')
      } catch (err) {
        console.error('Error resetting reader:', err)
      }
    }

    // Stop all video tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('📹 Video track stopped:', track.label)
      })
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.pause()
    }
    
    // Reset UI state
    setIsScanning(false)
    setIsLoading(false)
    setTorchEnabled(false)
    setCameraInfo('')
    
    // Restore body scroll
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.documentElement.style.overflow = ''
    
    console.log('✅ Scanner stopped')
  }

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (!open) {
      stopScanning()
      setError(null)
      return
    }

    let mounted = true
    setIsLoading(true)
    setError(null)

    const initializeScanner = async () => {
      try {
        console.log('🚀 Initializing bulletproof scanner...')
        
        // #region agent log - Detect mobile device once at start
        const isMobile = isMobileDevice()
        // #endregion
        
        // Wait for DOM to be fully mounted
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (!mounted || !videoRef.current) {
          console.log('⚠️ Component unmounted or video not ready')
          return
        }

        // STEP 1: Get camera stream with FALLBACK strategy
        let stream: MediaStream | null = null
        let usedFallback = false

        try {
          // Try 1: Back camera + HD resolution
          console.log('📸 Attempting HD back camera (1280x720)...')
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: { ideal: 16/9 },
            }
          })
          console.log('✅ HD camera acquired')
        } catch (hdError) {
          console.warn('⚠️ HD failed, falling back to basic config:', hdError)
          
          try {
            // Try 2: Any camera + any resolution (FALLBACK)
            stream = await navigator.mediaDevices.getUserMedia({ video: true })
            usedFallback = true
            console.log('✅ Fallback camera acquired')
          } catch (fallbackError) {
            throw fallbackError // Re-throw if both fail
          }
        }

        if (!mounted || !videoRef.current || !stream) {
          console.log('⚠️ Component unmounted during stream acquisition')
          stream?.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream

        // STEP 2: Attach stream to video element MANUALLY
        videoRef.current.srcObject = stream
        console.log('📹 Stream attached to video element')

        // STEP 3: Wait for video to be PHYSICALLY playing
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000)

          const onCanPlay = () => {
            console.log('▶️ Video can play')
            video.play().then(() => {
              console.log('✅ Video is playing')
              
              // Check if video has actual dimensions
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                console.log(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`)
                clearTimeout(timeout)
                resolve()
              } else {
                setTimeout(() => {
                  if (video.videoWidth > 0) {
                    clearTimeout(timeout)
                    resolve()
                  }
                }, 500)
              }
            }).catch(reject)
          }

          video.addEventListener('canplay', onCanPlay, { once: true })
          video.load() // Force load
        })

        if (!mounted) {
          console.log('⚠️ Component unmounted during video load')
          return
        }

        // Get video track info
        const videoTrack = stream.getVideoTracks()[0]
        const settings = videoTrack.getSettings()
        const cameraLabel = videoTrack.label || 'Camera'
        const resolution = `${settings.width || '?'}x${settings.height || '?'}`
        
        setCameraInfo(`${cameraLabel} - ${resolution}${usedFallback ? ' (Fallback)' : ''}`)
        console.log(`📷 Camera: ${cameraLabel}, Resolution: ${resolution}`)

        // Check torch support
        const capabilities = videoTrack.getCapabilities() as any
        if (capabilities.torch) {
          setTorchSupported(true)
          console.log('🔦 Torch supported')
        }

        // #region agent log - PHASE 2: Mobile-specific optimizations
        // Apply continuous focus mode for mobile (better for moving cameras)
        if (isMobile) {
          try {
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              await videoTrack.applyConstraints({
                // @ts-ignore
                advanced: [{ focusMode: 'continuous' }]
              })
              console.log('📱 Mobile: Continuous focus enabled')
              // #region agent log - Debug log
              fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:281',message:'Mobile continuous focus enabled',data:{isMobile:true,focusMode:'continuous'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'mobile-focus'})}).catch(()=>{});
              // #endregion
            }
          } catch (err) {
            console.warn('⚠️ Could not enable continuous focus:', err)
          }
        }
        // #endregion

        // STEP 4: NOW start ZXing decoder (video is already playing!)
        console.log('🔍 Creating ZXing decoder...')
        
        // #region agent log - Optimize barcode formats (PHASE 1: Reduce false positives)
        // Only enable essential retail formats (removed CODABAR, CODE_39, CODE_93, ITF)
        // Added QR_CODE for modern product packaging
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,      // European Article Number (most common)
          BarcodeFormat.EAN_8,       // Short EAN
          BarcodeFormat.UPC_A,       // Universal Product Code (US)
          BarcodeFormat.UPC_E,       // Short UPC
          BarcodeFormat.CODE_128,    // Flexible alphanumeric
          BarcodeFormat.QR_CODE,     // Modern 2D codes
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)
        codeReaderRef.current = reader
        
        // #region agent log - Debug log
        fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:283',message:'ZXing decoder configured',data:{isMobile,formatCount:6,formats:['EAN_13','EAN_8','UPC_A','UPC_E','CODE_128','QR_CODE']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'format-optimization'})}).catch(()=>{});
        // #endregion
        // #endregion
        
        // Create offscreen canvas for scanning (using larger ROI for reliability)
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas')
          // Use 80% of video frame for better detection (was 320x180, now ~1024x576)
          canvas.width = 640
          canvas.height = 480
          canvasRef.current = canvas
          console.log('📐 Canvas created for barcode scanning: 640x480')
        }
        
        // Create debug canvas (visible when debug mode is on)
        if (!debugCanvasRef.current && debugMode) {
          const debugCanvas = document.createElement('canvas')
          debugCanvas.width = 320
          debugCanvas.height = 240
          debugCanvasRef.current = debugCanvas
          console.log('🐛 Debug canvas created: 320x240')
        }

        // Auto-focus every 1 second (OPTIMIZED: was 2s, now 1s for faster re-focus)
        autoFocusIntervalRef.current = setInterval(() => {
          if (!streamRef.current || !mounted) return
          const track = streamRef.current.getVideoTracks()[0]
          const caps = track.getCapabilities() as any
          if (caps.focusMode) {
            track.applyConstraints({
              // @ts-ignore
              advanced: [{ focusMode: 'continuous' }]
            }).catch(() => {})
          }
        }, 1000)

        isScanningRef.current = true
        setIsScanning(true)
        setIsLoading(false)

        console.log('✅ Scanner ready - starting optimized decode loop')

        // STEP 5: Optimized scanning loop - Direct canvas decode (no image serialization!)
        const scan = async () => {
          if (!isScanningRef.current || !videoRef.current || !codeReaderRef.current || !canvasRef.current || !mounted) {
            console.log('🛑 Scan stopped - conditions not met')
            return
          }

          // CRITICAL: Check if video has data before decoding
          if (videoRef.current.readyState < 2) {
            // #region agent log - PHASE 2: Dynamic interval for readyState wait
            const waitInterval = isMobile ? 150 : 100
            // #endregion
            if (mounted && isScanningRef.current) {
              setTimeout(scan, waitInterval)
            }
            return
          }

          try {
            const video = videoRef.current
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            
            if (!ctx) {
              console.error('❌ Canvas context not available')
              // #region agent log - PHASE 2: Dynamic interval for context retry
              const retryInterval = isMobile ? 150 : 100
              // #endregion
              if (mounted && isScanningRef.current) {
                setTimeout(scan, retryInterval)
              }
              return
            }

            // #region agent log - PHASE 2: Dynamic ROI (REDUCED for mobile to prevent noise)
            // Mobile: 70% (focus on center only, avoid edge noise) - REDUCED from 90%
            // Desktop: 80% (more stable, can be more precise)
            const roiPercent = isMobile ? 0.7 : 0.8
            // #region agent log - ROI optimization
            fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:ROI',message:'ROI percent set for scan',data:{isMobile,roiPercent,videoWidth:video.videoWidth,videoHeight:video.videoHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'mobile-debug',hypothesisId:'H2_ROI'})}).catch(()=>{});
            // #endregion
            const videoWidth = video.videoWidth
            const videoHeight = video.videoHeight
            const roiWidth = Math.floor(videoWidth * roiPercent)
            const roiHeight = Math.floor(videoHeight * roiPercent)
            const roiX = Math.floor((videoWidth - roiWidth) / 2)
            const roiY = Math.floor((videoHeight - roiHeight) / 2)
            
            // #region agent log - Debug log
            fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:365',message:'ROI calculated',data:{isMobile,roiPercent,videoWidth,videoHeight,roiWidth,roiHeight},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'roi-optimization'})}).catch(()=>{});
            // #endregion
            // #endregion

            // Crop center 80% of frame to canvas
            ctx.drawImage(
              video,
              roiX, roiY, roiWidth, roiHeight, // Source: center 80%
              0, 0, canvas.width, canvas.height // Dest: scale to canvas size
            )

            // Update debug canvas if enabled
            if (debugMode && debugCanvasRef.current) {
              const debugCtx = debugCanvasRef.current.getContext('2d')
              if (debugCtx) {
                debugCtx.drawImage(canvas, 0, 0, debugCanvasRef.current.width, debugCanvasRef.current.height)
              }
            }

            // FIX: Create proper HTMLImageElement from canvas (ZXing requires .complete property!)
            // Previous: ImageBitmap caused TypeError - ImageBitmap has no .complete property
            const dataUrl = canvas.toDataURL('image/png')
            const img = new Image()
            img.src = dataUrl
            
            // Wait for image to load
            await new Promise((resolve) => {
              if (img.complete) {
                resolve(true)
              } else {
                img.onload = () => resolve(true)
              }
            })
            
            const result = await codeReaderRef.current.decodeFromImageElement(img)
            
            if (result) {
              const now = Date.now()
              const barcode = result.getText()
              const format = result.getBarcodeFormat()
              
              // #region agent log - PHASE 1: Validate barcode (prevent false positives)
              // 1. Minimum length check (reject very short barcodes)
              // #region agent log - Mobile scan attempt
              fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:SCAN_ATTEMPT',message:'ZXing decoded barcode',data:{barcode,length:barcode.length,format:BarcodeFormat[format],isMobile},timestamp:Date.now(),sessionId:'debug-session',runId:'mobile-debug',hypothesisId:'H4_PARTIAL_READ'})}).catch(()=>{});
              // #endregion
              
              if (barcode.length < 8) {
                console.log('⚠️ Barcode too short, ignoring:', barcode)
                // #region agent log - Debug log
                fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:418',message:'Barcode rejected (too short)',data:{barcode,length:barcode.length,format:BarcodeFormat[format]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'length-validation'})}).catch(()=>{});
                // #endregion
                const scanInterval = isMobile ? 500 : 150  // Increased mobile interval
                if (mounted && isScanningRef.current) {
                  setTimeout(scan, scanInterval)
                }
                return
              }
              
              // Mobile-specific: Detect partial EAN-13 reads (should be 13 digits)
              if (isMobile && format === BarcodeFormat.EAN_13 && barcode.length !== 13) {
                console.log('⚠️ [MOBILE] Partial EAN-13 read, ignoring:', barcode, `(${barcode.length}/13 digits)`)
                // #region agent log - Partial read detection
                fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:PARTIAL_EAN13',message:'Mobile partial EAN-13 read rejected',data:{barcode,actualLength:barcode.length,expectedLength:13,isMobile:true},timestamp:Date.now(),sessionId:'debug-session',runId:'mobile-debug',hypothesisId:'H4_PARTIAL_READ'})}).catch(()=>{});
                // #endregion
                const scanInterval = isMobile ? 500 : 150  // Increased mobile interval
                if (mounted && isScanningRef.current) {
                  setTimeout(scan, scanInterval)
                }
                return
              }
              
              // 2. EAN-13 checksum validation (most common retail barcode)
              if (format === BarcodeFormat.EAN_13) {
                const checksumValid = validateEAN13Checksum(barcode)
                // #region agent log - Checksum validation result
                fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:CHECKSUM',message:'EAN-13 checksum validation',data:{barcode,checksumValid,isMobile},timestamp:Date.now(),sessionId:'debug-session',runId:'mobile-debug',hypothesisId:'H3_CHECKSUM'})}).catch(()=>{});
                // #endregion
                
                if (!checksumValid) {
                  console.log('⚠️ EAN-13 checksum failed, ignoring:', barcode)
                  // #region agent log - Debug log
                  fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:435',message:'Barcode rejected (checksum failed)',data:{barcode,format:'EAN_13'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'checksum-validation'})}).catch(()=>{});
                  // #endregion
                  const scanInterval = isMobile ? 500 : 150  // Increased mobile interval
                  if (mounted && isScanningRef.current) {
                    setTimeout(scan, scanInterval)
                  }
                  return
                }
              }
              // #endregion
              
              // Debounce (2 second cooldown to prevent duplicate scans)
              if (now - lastScanRef.current < 2000) {
                const scanInterval = isMobile ? 500 : 150  // Increased mobile interval
                if (mounted && isScanningRef.current) {
                  setTimeout(scan, scanInterval)
                }
                return
              }
              
              lastScanRef.current = now
              
              console.log('✅ Barcode scanned:', barcode, `[${BarcodeFormat[format]}]`)
              
              // #region agent log - Debug log
              const timeSinceLastScan = now - lastScanRef.current
              fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:465',message:'Barcode ACCEPTED',data:{barcode,format:BarcodeFormat[format],length:barcode.length,isMobile,timeSinceLastScan},timestamp:Date.now(),sessionId:'debug-session',runId:'mobile-debug',hypothesisId:'scan-success'})}).catch(()=>{});
              // #endregion
              
              // Beep sound (with autoplay policy handling)
              if (soundEnabled) {
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
                  
                  // Resume context (required for some browsers)
                  if (audioContext.state === 'suspended') {
                    await audioContext.resume()
                  }
                  
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
                  console.debug('Beep disabled (autoplay policy):', err)
                }
              }
              
              // Haptic feedback
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100])
              }
              
              toast.success('Barcode scanned!', {
                description: `Code: ${barcode}`,
                duration: 2000,
              })

              // Wait 500ms for user to see result
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // Stop scanner and close
              stopScanning()
              onScanSuccessRef.current(barcode)
              onCloseRef.current()
            } else {
              // No barcode found - continue scanning
            // #region agent log - PHASE 2: Dynamic scan interval (FURTHER INCREASED for Samsung S24)
            const scanInterval = isMobile ? 800 : 150 // Mobile: 800ms (1.25 FPS) - FURTHER INCREASED for Samsung S24, Desktop: 150ms (6.7 FPS)
            // #region agent log - Scan timing log
            fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BarcodeScanner.tsx:SCAN_LOOP',message:'Scan loop continuing (no barcode)',data:{isMobile,scanInterval},timestamp:Date.now(),sessionId:'debug-session',runId:'mobile-debug-v2',hypothesisId:'H10_SLOWER'})}).catch(()=>{});
            // #endregion
            // #endregion
              if (mounted && isScanningRef.current) {
                setTimeout(scan, scanInterval)
              }
            }
          } catch (err: any) {
            // #region agent log - PHASE 2: Dynamic scan interval in error handling
            const scanInterval = isMobile ? 250 : 150
            // #endregion
            
            // Suppress common non-errors
            if (err.message && (
              err.message.includes('already playing') ||
              err.message.includes('NotFoundException')
            )) {
              if (mounted && isScanningRef.current) {
                setTimeout(scan, scanInterval)
              }
              return
            }

            // Log actual errors (initialization, permissions, etc.)
            if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
              console.error('❌ Scanner error:', err.message)
              setError(err.message)
              return
            }
            
            // Other decode errors - continue silently
            if (mounted && isScanningRef.current) {
              setTimeout(scan, scanInterval)
            }
          }
        }

        // Start scanning loop
        scan()

      } catch (err: any) {
        console.error('❌ Scanner initialization error:', err)
        
        setIsLoading(false)

        if (!mounted) return

        // Specific error handling
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
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application.')
          toast.error('Camera busy', {
            description: 'Please close other apps using the camera.',
          })
        } else {
          setError('Failed to access camera. Please try again.')
          toast.error('Scanner error', {
            description: err.message || 'Unable to start the camera.',
          })
        }
      }
    }

    initializeScanner()

    // Cleanup on unmount
    return () => {
      console.log('🧹 useEffect cleanup triggered')
      mounted = false
      stopScanning()
    }
  }, [open, soundEnabled])

  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      const newTorchState = !torchEnabled
      await videoTrack.applyConstraints({
        // @ts-ignore
        advanced: [{ torch: newTorchState }]
      })
      setTorchEnabled(newTorchState)
      toast.success(newTorchState ? 'Flashlight ON' : 'Flashlight OFF')
    } catch (err) {
      console.error('Torch toggle error:', err)
      toast.error('Failed to toggle flashlight')
    }
  }

  const handleRetry = () => {
    setError(null)
    stopScanning()
    
    // Re-open dialog to trigger initialization
    setTimeout(() => {
      onCloseRef.current()
    }, 100)
  }

  const handleClose = () => {
    stopScanning()
    onCloseRef.current()
  }

  // Keyboard shortcut: Shift+D to toggle debug mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        setDebugMode(prev => {
          const newMode = !prev
          console.log(`🐛 Debug mode: ${newMode ? 'ON' : 'OFF'}`)
          toast.info(`Debug mode: ${newMode ? 'ON' : 'OFF'}`, {
            description: newMode ? 'Debug canvas visible in bottom-left' : 'Debug canvas hidden',
          })
          return newMode
        })
      }
    }

    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl w-full max-w-full p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <div>
                  <DialogTitle>Scan Barcode</DialogTitle>
                  <DialogDescription className="mt-1">
                    Position barcode in center frame (EAN-13, CODE-128, UPC)
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

          {/* Scanner Area - FIXED ASPECT RATIO (Prevents Height Collapse) */}
          <div className="relative w-full aspect-square sm:aspect-video bg-black overflow-hidden shadow-inner">
            {/* Layer 0: Video Element - ALWAYS RENDERED (Bottom Layer - z-0) */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover block z-0"
              autoPlay
              playsInline
              muted
              style={{
                opacity: isScanning && !error ? 1 : 0,
                transition: 'opacity 300ms ease-in-out',
              }}
            />

            {/* Layer 1: Viewfinder Overlay (Middle Layer - z-10) */}
            {isScanning && !error && (
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Clear central focus box with darkened edges via box-shadow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[320px] h-[180px]">
                    {/* Transparent scanning area - box-shadow creates darkened edges! */}
                    <div 
                      className="absolute inset-0 border-2 border-primary/80 rounded-lg"
                      style={{
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                      }}
                    >
                      {/* Corner indicators */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                      
                      {/* Animated scanning line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan-line" />
                    </div>

                    {/* Instruction text */}
                    <div className="absolute -bottom-12 left-0 right-0 text-center">
                      <p className="text-white text-sm font-medium bg-black/70 inline-block px-4 py-2 rounded-full">
                        Hold steady - Auto-focusing...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layer 2: Loading Overlay (Top Layer - z-20) */}
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-white text-lg font-medium">Starting Camera...</p>
                  <p className="text-gray-400 text-sm">Initializing scanner with fallback support</p>
                </div>
              </div>
            )}

            {/* Layer 2: Error Overlay (Top Layer - z-20) */}
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

            {/* Debug Canvas (Bottom Left Corner - shows what scanner sees) */}
            {debugMode && debugCanvasRef.current && isScanning && !error && (
              <div className="absolute bottom-6 left-6 z-30 border-2 border-yellow-500 rounded-lg overflow-hidden shadow-lg">
                <canvas
                  ref={(el) => {
                    if (el && debugCanvasRef.current && !el.querySelector('canvas')) {
                      el.appendChild(debugCanvasRef.current)
                    }
                  }}
                  className="w-40 h-30 bg-black"
                />
                <div className="absolute top-0 left-0 bg-yellow-500 text-black text-xs px-2 py-1 font-bold">
                  DEBUG
                </div>
              </div>
            )}

            {/* Layer 3: Control Buttons (Always on Top - z-30) */}
            {isScanning && !error && (
              <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-30">
                {/* Debug Toggle (Hidden - press Shift+D to toggle) */}
                
                {/* Torch Toggle */}
                {torchSupported && (
                  <Button
                    variant="default"
                    size="icon"
                    onClick={toggleTorch}
                    className="h-14 w-14 rounded-full shadow-lg"
                    title="Toggle Flashlight"
                  >
                    {torchEnabled ? (
                      <FlashlightOff className="h-6 w-6" />
                    ) : (
                      <Flashlight className="h-6 w-6" />
                    )}
                  </Button>
                )}
                
                {/* Sound Toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-14 w-14 rounded-full shadow-lg bg-background"
                  title="Toggle Beep Sound"
                >
                  <Volume2 className={`h-6 w-6 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t bg-background flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <div className="flex-1 text-xs sm:text-sm text-muted-foreground text-center sm:text-left flex items-center justify-center sm:justify-start gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Initializing scanner...</span>
                  </>
                ) : isScanning ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="hidden sm:inline">{cameraInfo || 'Scanner active'}</span>
                    <span className="sm:hidden">Scanning...</span>
                  </>
                ) : (
                  'Ready to scan'
                )}
              </div>
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
