import {
  FileText,
  BookOpen,
  Home,
  Package,
  Settings,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  name: string
  href: string
  icon: LucideIcon
}

export const navigation: NavItem[] = [
  { name: 'Početna', href: '/dashboard', icon: Home },
  { name: 'Asortiman', href: '/inventory', icon: Package },
  { name: 'Magacin', href: '/warehouse', icon: Warehouse },
  { name: 'Katalozi', href: '/catalogs', icon: BookOpen },
  { name: 'Fakture', href: '/invoices', icon: FileText },
  { name: 'Finansije', href: '/finance', icon: Wallet },
  { name: 'Podešavanja', href: '/settings', icon: Settings },
]

/** Thumb-reach tabs on phones and tablets. Remaining destinations live in Više. */
export const mobileTabNavigation: NavItem[] = [
  { name: 'Početna', href: '/dashboard', icon: Home },
  { name: 'Asortiman', href: '/inventory', icon: Package },
  { name: 'Magacin', href: '/warehouse', icon: Warehouse },
]

export const mobileMoreNavigation: NavItem[] = [
  { name: 'Fakture', href: '/invoices', icon: FileText },
  { name: 'Katalozi', href: '/catalogs', icon: BookOpen },
  { name: 'Finansije', href: '/finance', icon: Wallet },
  { name: 'Podešavanja', href: '/settings', icon: Settings },
]
