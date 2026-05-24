import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { buildThemeToggleClassName } from '../../src/components/preferences/theme-toggle'

test('ThemeToggle uses a stable initial theme before syncing browser preference', () => {
  const source = readFileSync('src/components/preferences/theme-toggle.tsx', 'utf8')

  assert.equal(source.includes('useSyncExternalStore('), true)
  assert.equal(source.includes('() => DEFAULT_THEME'), true)
  assert.equal(source.includes('setTheme(readThemePreference())'), false)
  assert.equal(source.includes('useState<ThemeMode>(readThemePreference)'), false)
})

test('ThemeToggle reserves stable width so locale switching does not shift neighboring controls', () => {
  const className = buildThemeToggleClassName()

  assert.equal(className.includes('min-w-[8rem]'), true)
  assert.equal(className.includes('justify-center'), true)
  assert.equal(className.includes('whitespace-nowrap'), true)
})
