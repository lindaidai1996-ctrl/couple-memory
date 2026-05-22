import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LocaleSwitcher } from '@/components/preferences/locale-switcher'
import { ThemeToggle } from '@/components/preferences/theme-toggle'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="mx-auto grid h-screen w-full max-w-[1460px] gap-3 overflow-hidden px-3 py-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <Sidebar />
      <main className="dashboard-panel dashboard-scroll-shell relative min-h-0 min-w-0 overflow-y-scroll rounded-[22px]">
        <div className="absolute right-4 top-4 z-30 flex flex-wrap items-center justify-end gap-2 sm:right-5 sm:top-5">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>

        <div className="mx-auto min-h-full max-w-[1180px] px-4 py-20 sm:px-6 sm:pt-24 lg:px-7 lg:py-6 lg:pt-24">
          {children}
        </div>
      </main>
    </div>
  )
}
