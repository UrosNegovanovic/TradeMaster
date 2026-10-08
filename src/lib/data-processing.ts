import { isAnalyticsEnabled } from '@/lib/analytics'
import { SENTRY_DSN } from '@/lib/sentry-options'

/**
 * Sub-processors and cookie facts for /uslovi (DPA, ROADMAP A2.10) and /privatnost.
 * Optional services are listed only while they are switched on, so the pages never
 * name a service that is not running, and never miss one that is.
 */
export type Subprocessor = { name: string; purpose: string; location: string }

export type ProcessingFlags = {
  analytics: boolean
  sentry: boolean
  sharedRateLimit: boolean
}

export function currentProcessingFlags(env: NodeJS.ProcessEnv = process.env): ProcessingFlags {
  return {
    analytics: isAnalyticsEnabled(),
    sentry: Boolean(SENTRY_DSN),
    sharedRateLimit: Boolean(
      (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) || (env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
    ),
  }
}

export function subprocessors(flags: ProcessingFlags): Subprocessor[] {
  const list: Subprocessor[] = [
    {
      name: 'Supabase Inc.',
      purpose: 'baza podataka i čuvanje slika (svi podaci naloga)',
      location: 'EU, Irska (AWS eu-west-1)',
    },
    {
      name: 'Vercel Inc.',
      purpose: 'hosting aplikacije i obrada zahteva',
      location: 'serverske funkcije u EU (Dablin); kompanija iz SAD',
    },
    {
      name: 'Clerk Inc.',
      purpose: 'registracija, prijava i kolačići sesije (e-pošta i podaci za prijavu)',
      location: 'SAD',
    },
  ]
  if (flags.sharedRateLimit) {
    list.push({
      name: 'Upstash Inc.',
      purpose: 'zaštita od zloupotrebe: kratkotrajni brojač zahteva po IP adresi, briše se posle nekoliko minuta',
      location: 'prema regionu baze brojača',
    })
  }
  if (flags.sentry) {
    list.push({
      name: 'Functional Software Inc. (Sentry)',
      purpose: 'prijava tehničkih grešaka, bez podataka o korisniku, kolačića i sadržaja zahteva',
      location: 'prema regionu Sentry naloga',
    })
  }
  if (flags.analytics) {
    list.push({
      name: 'Vercel Inc. (Web Analytics)',
      purpose: 'zbirno merenje poseta i nekoliko koraka u aplikaciji, bez kolačića i bez podataka o korisniku',
      location: 'kompanija iz SAD',
    })
  }
  return list
}

/** Plain statement about cookies; there is nothing to consent to while no optional cookie exists. */
export function cookieStatement(flags: ProcessingFlags): string {
  const base =
    'TradeMaster koristi samo kolačiće neophodne za prijavu i bezbedan rad naloga (Clerk). Ne koristimo oglasne kolačiće ni piksele.'
  return flags.analytics
    ? `${base} Posete merimo preko Vercel Web Analytics, koji ne postavlja kolačiće i ne prati vas između sajtova.`
    : `${base} Merenje poseta trenutno nije uključeno.`
}
