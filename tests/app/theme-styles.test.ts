import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

test('theme tokens remain runtime-overridable for theme switching', () => {
  const css = readFileSync('src/app/globals.css', 'utf8')

  assert.equal(css.includes('@theme inline'), false)
  assert.equal(css.includes('@theme {'), true)
})
