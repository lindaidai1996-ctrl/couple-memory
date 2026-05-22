import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1460px] gap-3 px-3 py-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <Sidebar />
      <main className="dashboard-panel min-w-0 overflow-hidden rounded-[22px]">
        <div className="mx-auto max-w-[1180px] px-4 py-5 pt-18 sm:px-6 lg:px-7 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  )
}
