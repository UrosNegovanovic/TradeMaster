import { NextResponse } from 'next/server'
import { accessStatus } from '@/lib/access-period'
import { MONTHLY_PRICE } from '@/lib/landing-copy'

export const ACCESS_EXPIRED_MESSAGE = `Pristup je istekao. Aplikacija je u režimu samo za pregled dok ne produžite pristup (${MONTHLY_PRICE} mesečno).`

/**
 * Manual billing: after the paid period ends the account becomes read-only. Write routes call this right
 * after loading the profile and return the response when it is not null. Reading, exporting, the profile
 * form and the public share links of already issued catalogs/invoices keep working, so no one is locked
 * out of their own data and the merchant's customers are not affected.
 */
export function accessExpiredResponse(profile: { accessExpiresAt?: Date | string | null }): NextResponse | null {
  if (accessStatus(profile.accessExpiresAt).state !== 'expired') return null
  return NextResponse.json({ error: ACCESS_EXPIRED_MESSAGE, code: 'ACCESS_EXPIRED' }, { status: 402 })
}
