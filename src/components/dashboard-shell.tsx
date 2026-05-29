import type { ReactNode } from 'react'

import { PreferenceDock } from '@/components/preferences/preference-dock'
import { Sidebar } from '@/components/sidebar'
import {
  buildDashboardContentClassName,
  buildDashboardLayoutClassName,
  buildDashboardPreferenceDockVisibility,
  type DashboardShellMode,
} from '@/components/dashboard-shell-classes'

export function DashboardShell({
  children,
  mode = 'default',
}: {
  children: ReactNode
  mode?: DashboardShellMode
}) {
  const showSidebar = mode === 'default'
  const showPreferenceDock = buildDashboardPreferenceDockVisibility({ mode })

  return (
    <div className={buildDashboardLayoutClassName({ mode })}>
      {showSidebar ? <Sidebar /> : null}
      <main className="dashboard-panel dashboard-scroll-shell relative min-h-0 min-w-0 overflow-y-scroll rounded-[22px]">
        {showPreferenceDock ? <PreferenceDock /> : null}
        <div className={buildDashboardContentClassName({ mode })}>
          {children}
        </div>
      </main>
    </div>
  )
}
