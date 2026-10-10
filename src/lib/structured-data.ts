import { FREE_PERIOD, MONTHLY_PRICE } from '@/lib/landing-copy'
import { absoluteUrl } from '@/lib/site-url'

/**
 * schema.org SoftwareApplication for the home page (ROADMAP A2.11). Only facts that are true today:
 * web app, the published price (20 EUR a month after the free period), Serbian.
 */
/** "20 €" → "20": the price stays defined once, in landing-copy. */
export const MONTHLY_PRICE_EUR = MONTHLY_PRICE.replace(/[^\d.,]/g, '').replace(',', '.')

export function softwareApplicationJsonLd(env: NodeJS.ProcessEnv = process.env): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TradeMaster',
    url: absoluteUrl('/', env),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web (Android, iPhone, računar)',
    inLanguage: 'sr',
    description: 'Skeniranje robe, lager, katalog, predračun, faktura sa IPS QR kodom i otpremnica za trgovce i malu veleprodaju.',
    offers: {
      '@type': 'Offer',
      price: MONTHLY_PRICE_EUR,
      priceCurrency: 'EUR',
      description: `Prvih ${FREE_PERIOD} besplatno, zatim mesečno`,
    },
  }
  // `<` escaped so the JSON can never close the surrounding <script> tag.
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
