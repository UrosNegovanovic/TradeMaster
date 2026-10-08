import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'
import { afterAuthPathForUser } from '@/lib/after-auth'
import { softwareApplicationJsonLd } from '@/lib/structured-data'

export const metadata: Metadata = {
  description:
    'Skenirajte robu, pratite lager, pošaljite katalog kupcu i izdajte fakturu sa QR kodom za plaćanje. Na telefonu i računaru.',
  alternates: { canonical: '/' },
}

export default async function Home() {
  if (process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth()
    const next = afterAuthPathForUser(userId)
    if (next) redirect(next)
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Static JSON built from our own constants (no user input), escaped against </script>.
        dangerouslySetInnerHTML={{ __html: softwareApplicationJsonLd() }}
      />
      <LandingPage />
    </>
  )
}
