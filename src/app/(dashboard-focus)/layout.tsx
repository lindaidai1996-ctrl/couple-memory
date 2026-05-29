import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard-shell'
import { auth } from '@/lib/auth'

export default async function DashboardFocusLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return <DashboardShell mode="focus-review">{children}</DashboardShell>
}
