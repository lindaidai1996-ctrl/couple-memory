import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildDashboardContentClassName,
  buildDashboardLayoutClassName,
  buildDashboardPreferenceDockVisibility,
  dashboardLayoutClassName,
  mobileNavButtonClassName,
  mobileNavOverlayClassName,
  sidebarAsideClassName,
  sidebarClosedClassName,
} from './dashboard-shell-classes'

test('dashboard shell uses xl breakpoint for persistent sidebar layout', () => {
  assert.match(dashboardLayoutClassName, /\bxl:grid-cols-\[220px_minmax\(0,1fr\)\]/)
  assert.doesNotMatch(dashboardLayoutClassName, /\blg:grid-cols-\[220px_minmax\(0,1fr\)\]/)
})

test('focus review shell drops the desktop sidebar column and widens content', () => {
  assert.doesNotMatch(
    buildDashboardLayoutClassName({ mode: 'focus-review' }),
    /\bxl:grid-cols-\[220px_minmax\(0,1fr\)\]/
  )

  const contentClassName = buildDashboardContentClassName({ mode: 'focus-review' })

  assert.match(contentClassName, /\bmax-w-none\b/)
  assert.match(contentClassName, /\bpt-6\b/)
})

test('focus review shell hides the global preference dock to avoid overlapping the review toolbar', () => {
  assert.equal(buildDashboardPreferenceDockVisibility({ mode: 'default' }), true)
  assert.equal(buildDashboardPreferenceDockVisibility({ mode: 'focus-review' }), false)

  const source = readFileSync('src/components/dashboard-shell.tsx', 'utf8')
  assert.match(source, /buildDashboardPreferenceDockVisibility/)
})

test('mobile navigation controls are hidden starting at xl', () => {
  assert.match(mobileNavButtonClassName, /\bxl:hidden\b/)
  assert.doesNotMatch(mobileNavButtonClassName, /\blg:hidden\b/)

  assert.match(mobileNavOverlayClassName, /\bxl:hidden\b/)
  assert.doesNotMatch(mobileNavOverlayClassName, /\blg:hidden\b/)
})

test('sidebar becomes persistent starting at xl', () => {
  assert.ok(sidebarAsideClassName.includes('xl:static'))
  assert.ok(sidebarAsideClassName.includes('xl:min-h-[calc(100vh-24px)]'))
  assert.ok(sidebarClosedClassName.includes('xl:translate-x-0'))

  assert.ok(!sidebarAsideClassName.includes('lg:static'))
  assert.ok(!sidebarClosedClassName.includes('lg:translate-x-0'))
})
