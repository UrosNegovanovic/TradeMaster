import { BarChart3, Building2, Receipt, type LucideIcon } from 'lucide-react'

export type OwnerNavItem = {
  name: string
  href: string
  icon: LucideIcon
  /** False until the step that builds the page is merged: shown grey with "uskoro", not a link. */
  ready: boolean
}

/** Owner panel menu (ROADMAP O2 Statistika, O3 Nalozi, O5 Naplata). Flip `ready` when the page exists. */
export const ownerNavigation: OwnerNavItem[] = [
  { name: 'Statistika', href: '/owner/stats', icon: BarChart3, ready: true },
  { name: 'Nalozi', href: '/owner/accounts', icon: Building2, ready: true },
  { name: 'Naplata', href: '/owner/billing', icon: Receipt, ready: false },
]
