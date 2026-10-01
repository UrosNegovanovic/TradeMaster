import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'
import { afterAuthPathForUser } from '@/lib/after-auth'

export const metadata: Metadata = {
  description:
    'Unosi proizvode kamerom telefona, prati zalihe i pripremi kataloge i fakture — na telefonu i računaru.',
  alternates: { canonical: '/' },
}

export default async function Home() {
  if (process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth()
    const next = afterAuthPathForUser(userId)
    if (next) redirect(next)
  }

  return <LandingPage />
}
