'use client'

import { useEffect } from 'react'
import { reachedMilestones, trackOnce, type MilestoneInput } from '@/lib/analytics'

type AnalyticsMilestonesProps = Omit<MilestoneInput, 'now' | 'profileCreatedAt'> & {
  /** ISO string: server components pass dates across the client boundary as text. */
  profileCreatedAt: string
}

/** Renders nothing; reports the milestones the company has reached, once per browser. */
export function AnalyticsMilestones(props: AnalyticsMilestonesProps) {
  const { profileCreatedAt, productCount, invoiceCount, sharedCatalogCount, sharedInvoiceCount } = props

  useEffect(() => {
    for (const event of reachedMilestones({
      profileCreatedAt,
      productCount,
      invoiceCount,
      sharedCatalogCount,
      sharedInvoiceCount,
    })) {
      trackOnce(event)
    }
  }, [profileCreatedAt, productCount, invoiceCount, sharedCatalogCount, sharedInvoiceCount])

  return null
}
