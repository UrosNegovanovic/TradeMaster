import { isAnalyticsEnabled } from '@/lib/analytics'
import { SENTRY_DSN, isEuSentryDsn } from '@/lib/sentry-options'

/**
 * Sub-processors and cookie facts for /uslovi (DPA, ROADMAP A2.10) and /privatnost.
 * All six services are always listed: the DPA promises notice before a new sub-processor,
 * so the list must not change by itself in a deploy. Env vars only switch the
 * "uključeno" / "trenutno nije uključeno" label.
 */
export type Subprocessor = {
  name: string
  purpose: string
  location: string
  /** False for services that exist in the code but are switched off in this deployment. */
  enabled: boolean
}

export type ProcessingFlags = {
  analytics: boolean
  sentry: boolean
  sharedRateLimit: boolean
}

export function currentProcessingFlags(env: NodeJS.ProcessEnv = process.env): ProcessingFlags {
  return {
    analytics: isAnalyticsEnabled(),
    // Sentry runs only with an EU (de.sentry.io) DSN, so "EU (Nemačka)" below stays true.
    sentry: isEuSentryDsn(SENTRY_DSN),
    sharedRateLimit: Boolean(
      (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) || (env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
    ),
  }
}

export function subprocessors(flags: ProcessingFlags): Subprocessor[] {
  return [
    {
      name: 'Supabase Inc.',
      purpose: 'baza podataka i čuvanje slika (svi podaci naloga)',
      location: 'EU (Irska)',
      enabled: true,
    },
    {
      name: 'Vercel Inc.',
      purpose:
        'hosting aplikacije; zahteve obrađuju serverske funkcije u Dablinu, a kompanija iz SAD može imati pristup radi rada usluge (logovi, podrška)',
      location: 'EU (Irska); kompanija iz SAD',
      enabled: true,
    },
    {
      name: 'Clerk Inc.',
      purpose:
        'registracija i prijava korisnika aplikacije (e-pošta, IP adresa, sesija); ne prima podatke vaših kupaca',
      location: 'SAD',
      enabled: true,
    },
    {
      name: 'Upstash Inc.',
      purpose: 'zaštita od zloupotrebe: kratkotrajni brojač zahteva po IP adresi, briše se posle nekoliko minuta',
      location: 'EU (Irska)',
      enabled: flags.sharedRateLimit,
    },
    {
      name: 'Functional Software Inc. (Sentry)',
      purpose: 'prijava tehničkih grešaka, bez podataka o korisniku, kolačića i sadržaja zahteva',
      location: 'EU (Nemačka)',
      enabled: flags.sentry,
    },
    {
      name: 'Vercel Inc. (Web Analytics)',
      purpose: 'zbirno merenje poseta i nekoliko koraka u aplikaciji, bez kolačića i bez podataka o korisniku',
      location: 'kompanija iz SAD',
      enabled: flags.analytics,
    },
  ]
}

export function subprocessorStatus(processor: Subprocessor): string {
  return processor.enabled ? 'uključeno' : 'trenutno nije uključeno'
}

/** Plain statement about cookies; there is nothing to consent to while no optional cookie exists. */
export function cookieStatement(flags: ProcessingFlags): string {
  const base =
    'TradeMaster koristi samo kolačiće neophodne za prijavu i bezbedan rad naloga (Clerk). Ne koristimo oglasne kolačiće ni piksele.'
  return flags.analytics
    ? `${base} Posete merimo preko Vercel Web Analytics, koji ne postavlja kolačiće i ne prati vas između sajtova.`
    : `${base} Merenje poseta trenutno nije uključeno.`
}
