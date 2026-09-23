'use client'

import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { CatalogStage } from './mocks'

export function LandingDemo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function startPlayback() {
    setPlaying(true)
    const video = videoRef.current
    if (!video) return
    void video.play()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]">
      <div className="relative aspect-[16/10] w-full sm:aspect-video">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-neutral-900 object-cover"
          controls={playing}
          playsInline
          preload="metadata"
          poster="/landing-demo-poster.jpg"
          controlsList="nodownload"
        >
          <source src="/landing-demo.mp4" type="video/mp4" />
          Demo nije mogao da se učita.
        </video>

        {playing ? null : (
          <div className="absolute inset-0">
            <CatalogStage className="h-full w-full" />
            <button
              type="button"
              onClick={startPlayback}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/10 text-white"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand shadow-lg">
                <Play className="ml-0.5 h-7 w-7 fill-current" />
              </span>
              <span className="rounded-full bg-white/95 px-3 py-1 text-sm font-medium text-foreground shadow-sm">
                Pogledaj demo · 25 s
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
