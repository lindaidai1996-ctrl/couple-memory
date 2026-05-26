import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLocaleSwitcherClassName,
  buildLocaleSwitcherOptionClassName,
} from '../../src/components/preferences/locale-switcher'

test('locale switcher keeps focus styles local without adding outline jitter', () => {
  const className = buildLocaleSwitcherOptionClassName(false)
  const activeClassName = buildLocaleSwitcherOptionClassName(true)

  assert.match(className, /\bfocus-visible:outline-none\b/)
  assert.match(className, /\bfocus-visible:ring-0\b/)
  assert.match(className, /\bfocus-visible:shadow-none\b/)
  assert.match(className, /\bborder\b/)
  assert.match(className, /\bborder-transparent\b/)
  assert.doesNotMatch(className, /\btransition-all\b/)
  assert.match(className, /\btransition-colors\b/)
  assert.match(activeClassName, /\bdashboard-pill-active\b/)
  assert.match(className, /\bhover:bg-white\/24\b/)
  assert.match(className, /\bdark:hover:bg-white\/6\b/)
})

test('locale switcher uses the same stable shell rhythm as the theme toggle', () => {
  const className = buildLocaleSwitcherClassName()
  const optionClassName = buildLocaleSwitcherOptionClassName(false)

  assert.equal(className.includes('h-9'), true)
  assert.equal(className.includes('p-1'), true)
  assert.equal(className.includes('backdrop-blur'), true)
  assert.equal(className.includes('bg-white/24'), true)
  assert.equal(className.includes('dark:bg-white/3'), true)
  assert.equal(optionClassName.includes('min-w-[3.5rem]'), true)
  assert.equal(optionClassName.includes('font-medium'), true)
})
