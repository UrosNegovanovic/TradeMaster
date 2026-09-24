'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

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
    <div className="overflow-hidden rounded-[16px] bg-[#f4f5f6] shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]">
      <div className="relative aspect-[4/3] w-full sm:aspect-[21/9]">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-neutral-900 object-cover"
          controls={playing}
          playsInline
          preload="metadata"
          poster="/landing/demo-stage.png"
          controlsList="nodownload"
          aria-label="Demo TradeMaster, 25 sekundi"
        >
          <source src="/landing-demo.mp4" type="video/mp4" />
          <track
            kind="captions"
            srcLang="sr"
            label="Opis"
            src="/landing-demo-captions.vtt"
          />
          Demo nije mogao da se učita.
        </video>

        {playing ? null : (
          <button
            type="button"
            onClick={startPlayback}
            className="absolute inset-0 z-10"
          >
            <Image
              src="/landing/demo-stage.png"
              alt=""
              fill
              sizes="1200px"
              className="object-cover object-[18%_center] sm:object-center"
            />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg sm:h-16 sm:w-16">
                <Play className="ml-0.5 h-6 w-6 fill-current sm:h-7 sm:w-7" />
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-foreground shadow-sm">
                Pogledaj demo · 25 s
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
