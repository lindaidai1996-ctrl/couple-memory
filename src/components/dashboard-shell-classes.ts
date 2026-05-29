export type DashboardShellMode = 'default' | 'focus-review'

export function buildDashboardLayoutClassName({
  mode = 'default',
}: {
  mode?: DashboardShellMode
} = {}) {
  if (mode === 'focus-review') {
    return 'mx-auto grid h-screen w-full max-w-[1600px] gap-3 overflow-hidden px-3 py-3'
  }

  return 'mx-auto grid h-screen w-full max-w-[1460px] gap-3 overflow-hidden px-3 py-3 xl:grid-cols-[220px_minmax(0,1fr)]'
}

export function buildDashboardContentClassName({
  mode = 'default',
}: {
  mode?: DashboardShellMode
} = {}) {
  if (mode === 'focus-review') {
    return 'mx-auto min-h-full max-w-none px-0 py-6 pt-6'
  }

  return 'mx-auto min-h-full max-w-[1180px] px-4 py-20 sm:px-6 sm:pt-24 lg:px-7 lg:py-6 lg:pt-24'
}

export function buildDashboardPreferenceDockVisibility({
  mode = 'default',
}: {
  mode?: DashboardShellMode
} = {}) {
  return mode === 'default'
}

export const dashboardLayoutClassName = buildDashboardLayoutClassName()

export const mobileNavButtonClassName =
  'xl:hidden fixed left-4 top-4 z-50 shadow-sm'

export const mobileNavOverlayClassName =
  'xl:hidden fixed inset-0 z-40 bg-black/30 transition-opacity duration-300'

export const sidebarAsideClassName =
  'dashboard-panel-soft fixed inset-y-0 left-0 z-50 flex w-60 flex-col rounded-r-[22px] transition-transform duration-300 ease-out xl:static xl:min-h-[calc(100vh-24px)] xl:rounded-[22px]'

export const sidebarClosedClassName = '-translate-x-full xl:translate-x-0'
