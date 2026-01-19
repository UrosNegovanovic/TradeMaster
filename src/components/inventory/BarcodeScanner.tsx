'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Camera, Flashlight, FlashlightOff, RotateCcw, Volume2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

        // STEP 4: NOW start ZXing decoder (video is already playing!)
        console.log('🔍 Creating ZXing decoder...')
        
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR,
          BarcodeFormat.ITF,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)
        codeReaderRef.current = reader
        
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
            if (mounted && isScanningRef.current) {
              setTimeout(scan, 100)
            }
            return
          }

          try {
            const video = videoRef.current
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            
            if (!ctx) {
              console.error('❌ Canvas context not available')
              if (mounted && isScanningRef.current) {
                setTimeout(scan, 100)
              }
              return
            }

            // Calculate center ROI - WIDENED to 80% of frame (was 25%)
            // This gives ZXing a much larger area to detect barcodes
            const videoWidth = video.videoWidth
            const videoHeight = video.videoHeight
            const roiWidth = Math.floor(videoWidth * 0.8)   // 80% width (~1024 for 1280)
            const roiHeight = Math.floor(videoHeight * 0.8) // 80% height (~576 for 720)
            const roiX = Math.floor((videoWidth - roiWidth) / 2)
            const roiY = Math.floor((videoHeight - roiHeight) / 2)

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
              
              // Debounce (2 second cooldown to prevent duplicate scans)
              if (now - lastScanRef.current < 2000) {
                if (mounted && isScanningRef.current) {
                  setTimeout(scan, 50) // OPTIMIZED: 50ms = 20 FPS (was 100ms = 10 FPS)
                }
                return
              }
              
              lastScanRef.current = now
              
              console.log('✅ Barcode scanned:', barcode, `[${BarcodeFormat[format]}]`)
              
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
              if (mounted && isScanningRef.current) {
                setTimeout(scan, 150) // 150ms = ~6.7 FPS (balanced for reliability)
              }
            }
          } catch (err: any) {
            // Suppress common non-errors
            if (err.message && (
              err.message.includes('already playing') ||
              err.message.includes('NotFoundException')
            )) {
              if (mounted && isScanningRef.current) {
                setTimeout(scan, 150)
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
              setTimeout(scan, 150)
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
