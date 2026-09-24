'use client'

import { useRef, useState } from 'react'
import { Play } from 'lucide-react'

export function LandingDemo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  async function startPlayback() {
    const video = videoRef.current
    if (!video) return
    try {
      video.muted = true
      await video.play()
      setPlaying(true)
    } catch {
      setFailed(true)
    }
  }

  return (
    <figure className="m-0">
      <div
        id="demo-player"
        className="overflow-hidden rounded-[16px] bg-neutral-950 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]"
      >
        <div className="relative aspect-video w-full">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full bg-neutral-950 object-contain"
            controls={playing && !failed}
            playsInline
            preload="metadata"
            poster="/landing-demo-poster.jpg"
            controlsList="nodownload"
            onError={() => setFailed(true)}
            onPlay={() => setPlaying(true)}
            aria-label="Pregled ekrana TradeMaster, 25 sekundi"
            aria-describedby="demo-opis"
          >
            <source src="/landing-demo.mp4" type="video/mp4" />
            <track
              kind="captions"
              srcLang="sr"
              label="Opis"
              src="/landing-demo-captions.vtt"
              default
            />
            Demo nije mogao da se učita.
          </video>

          {failed ? (
            <p className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950 px-6 text-center text-[15px] leading-relaxed text-white">
              Demo nije mogao da se pusti. Osveži stranicu ili otvori je u drugom
              pregledaču.
            </p>
          ) : playing ? null : (
            <button
              type="button"
              onClick={() => void startPlayback()}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand shadow-sm">
                <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
              </span>
              <span className="rounded-full bg-white/95 px-3 py-1 text-[13px] font-medium text-neutral-900">
                Pogledaj pregled · 25 s
              </span>
            </button>
          )}
        </div>
      </div>
      <figcaption
        id="demo-opis"
        className="mt-3 text-center text-[14px] leading-relaxed text-neutral-600"
      >
        Pregled ekrana (25 s), pušta se ručno i bez zvuka. Nije snimak skeniranja
        u hali — pravi kadrovi skena, potvrđenog unosa i kataloga sa slikama još
        nisu snimljeni.
      </figcaption>
    </figure>
  )
}
