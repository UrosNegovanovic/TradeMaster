import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  description:
    'Unosi proizvode kamerom telefona, prati zalihe i pripremi kataloge i fakture — na telefonu i računaru.',
  alternates: { canonical: '/' },
}

export default function Home() {
  return <LandingPage />
}
