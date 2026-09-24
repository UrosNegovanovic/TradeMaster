'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

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
              sizes="1800px"
              className="object-cover object-[18%_center] sm:object-center"
            />
            <span className="sr-only">Pogledaj demo, 25 sekundi</span>
          </button>
        )}
      </div>
    </div>
  )
}
