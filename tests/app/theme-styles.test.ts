import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

test('theme tokens remain runtime-overridable for theme switching', () => {
  const css = readFileSync('src/app/globals.css', 'utf8')

  assert.equal(css.includes('@theme inline'), false)
  assert.equal(css.includes('@theme {'), true)
})

test('dashboard theme exposes Velvet Plum token families', () => {
  const css = readFileSync('src/app/globals.css', 'utf8')

  assert.equal(css.includes('--vp-bg-light: #f1eded;'), true)
  assert.equal(css.includes('--vp-bg-dark: #161116;'), true)
  assert.equal(css.includes('--color-warm-accent: var(--vp-accent-light);'), true)
  assert.equal(css.includes('--color-warm-surface: var(--vp-panel-strong-light);'), true)
  assert.equal(css.includes('--color-warm-sidebar: var(--vp-sidebar-light);'), true)
})
