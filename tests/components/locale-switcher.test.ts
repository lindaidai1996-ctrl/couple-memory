import assert from 'node:assert/strict'
import test from 'node:test'

import { buildLocaleSwitcherOptionClassName } from '../../src/components/preferences/locale-switcher'

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
})
