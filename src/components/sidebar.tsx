'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LocaleSwitcher } from '@/components/preferences/locale-switcher'
import { ThemeToggle } from '@/components/preferences/theme-toggle'

export function Sidebar() {
  const t = useTranslations('Sidebar')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: DashboardIcon },
    { href: '/albums', label: t('albums'), icon: AlbumIcon },
    { href: '/timeline', label: t('timeline'), icon: TimelineIcon },
    { href: '/pipeline', label: t('pipeline'), icon: PipelineIcon },
    { href: '/settings', label: t('settings'), icon: SettingsIcon },
  ]

  return (
    <>
      {/* 移动端触发按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="dashboard-glass-button lg:hidden fixed left-4 top-4 z-50 rounded-full p-2.5 shadow-sm"
        aria-label={t('openNavigation')}
      >
        <MenuIcon />
      </button>

      {/* 移动端遮罩 */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/30 transition-opacity duration-300
          ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* 侧边栏 */}
      <aside
        className={`dashboard-panel-soft fixed inset-y-0 left-0 z-50 flex w-60 flex-col rounded-r-[22px]
          transition-transform duration-300 ease-out lg:static lg:min-h-[calc(100vh-24px)] lg:rounded-[22px]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="border-b border-warm-border px-5 pb-4 pt-5">
          <p className="mb-2 text-[9px] uppercase tracking-[0.28em] text-warm-accent">
            Memory Atelier
          </p>
          <h2 className="font-[var(--font-display)] text-[27px] leading-[0.92] tracking-[-0.05em] text-warm-text">
            Couple Memory
          </h2>
          <p className="mt-2 max-w-[156px] text-[11px] leading-[1.52] text-warm-muted">
            A quieter editorial workspace for chapters, timelines, and memory curation.
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-[15px]
                  border px-2.5 py-2.5 transition-all duration-150
                  ${isActive
                    ? 'dashboard-pill-active border-white/15'
                    : 'border-transparent text-warm-muted hover:translate-x-[3px] hover:border-warm-border hover:bg-white/4 hover:text-warm-text'
                  }`}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-full border text-[9px] uppercase tracking-[0.12em]
                  ${isActive ? 'border-white/20 bg-white/8 text-white' : 'border-white/14 bg-white/10 text-warm-text'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className={`mt-0.5 block text-[9px] uppercase tracking-[0.22em] ${isActive ? 'text-white/72' : 'text-warm-muted'}`}>
                    {item.href.replace('/', '') || 'home'}
                  </span>
                </span>
                <span className={`font-[var(--font-display)] text-sm ${isActive ? 'text-white/80' : 'text-warm-muted/70'}`}>
                  <item.icon active={isActive} />
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="space-y-3 border-t border-warm-border px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  )
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function AlbumIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function TimelineIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M14 6h4" />
      <path d="M6 12h4" />
      <path d="M14 18h4" />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function PipelineIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 12h4" />
      <path d="M14 6h3" />
      <path d="M14 18h3" />
      <path d="M12 8v8" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
