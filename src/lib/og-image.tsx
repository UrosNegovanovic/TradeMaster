import { ImageResponse } from 'next/og'

/**
 * Link-preview image (1200×630) for WhatsApp, Viber, Facebook and search (ROADMAP A2.11).
 * Edge runtime (the image routes export runtime = 'edge'); assets load through import.meta.url,
 * the pattern Next.js documents for ImageResponse.
 * Fonts: small subsets of Liberation Sans in src/assets/og (see its README). The full fonts made the
 * edge function larger than Vercel's Edge Function size limit, so every OG text must use only
 * OG_FONT_CHARS from og-image-text.ts (tested there).
 */
export const OG_SIZE = { width: 1200, height: 630 }

export const OG_CONTENT_TYPE = 'image/png'

const BRAND = '#1a6e5c'

export async function renderOgImage({ eyebrow, headline, footer }: { eyebrow: string; headline: string[]; footer: string }) {
  const [regular, bold, mark] = await Promise.all([
    fetch(new URL('../assets/og/TMOGSans-Regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../assets/og/TMOGSans-Bold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../public/mark.svg', import.meta.url)).then((r) => r.text()),
  ])
  const markSrc = `data:image/svg+xml;base64,${btoa(mark)}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#f8fafb',
          borderLeft: `18px solid ${BRAND}`,
          fontFamily: 'TMOG Sans',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img>, not next/image */}
          <img src={markSrc} width={76} height={76} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: BRAND }}>TradeMaster</div>
            <div style={{ fontSize: 24, color: '#4b5563' }}>{eyebrow}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {headline.map((line) => (
            <div key={line} style={{ fontSize: 64, fontWeight: 700, color: '#111827', lineHeight: 1.15 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 28, color: '#4b5563' }}>{footer}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'TMOG Sans', data: regular, weight: 400, style: 'normal' },
        { name: 'TMOG Sans', data: bold, weight: 700, style: 'normal' },
      ],
    }
  )
}
