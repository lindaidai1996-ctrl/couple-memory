import test from 'node:test'
import assert from 'node:assert/strict'

import {
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
