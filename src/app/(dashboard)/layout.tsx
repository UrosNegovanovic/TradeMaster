import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ownerRedirectFromTenantPages } from '@/lib/platform-owner'

export default async function Layout({ children }: { children: React.ReactNode }) {
  // The platform owner sees only the owner panel (ROADMAP O1); nothing changes for anyone else.
  const ownerPath = await ownerRedirectFromTenantPages()
  if (ownerPath) redirect(ownerPath)

  return <DashboardLayout>{children}</DashboardLayout>
}
