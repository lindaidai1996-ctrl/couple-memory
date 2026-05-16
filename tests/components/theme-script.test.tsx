import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('ThemeScript injects script with useServerInsertedHTML instead of returning a script node', () => {
  const source = readFileSync('src/app/theme-script.tsx', 'utf8')

  assert.equal(source.includes('useServerInsertedHTML(() => ('), true)
  assert.equal(source.includes('return null'), true)
})
