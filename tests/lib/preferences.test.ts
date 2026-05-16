import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  getNextThemeMode,
  isLocale,
  isThemeMode,
  pickLocale,
  pickThemeMode,
  resolveThemeMode,
} from '../../src/lib/preferences'

test('pickThemeMode falls back to default theme for unknown values', () => {
  assert.equal(pickThemeMode('sepia'), DEFAULT_THEME)
  assert.equal(pickThemeMode(undefined), DEFAULT_THEME)
})

test('pickThemeMode keeps supported explicit modes', () => {
  assert.equal(pickThemeMode('light'), 'light')
  assert.equal(pickThemeMode('dark'), 'dark')
  assert.equal(pickThemeMode('system'), 'system')
})

test('pickLocale prefers supported cookie locale', () => {
  assert.equal(pickLocale('en', 'zh-CN,zh;q=0.9,en;q=0.8'), 'en')
})

test('pickLocale falls back to accept-language when cookie locale is missing', () => {
  assert.equal(pickLocale(undefined, 'en-US,en;q=0.9,zh;q=0.8'), 'en')
})

test('pickLocale falls back to default locale when nothing matches', () => {
  assert.equal(pickLocale('fr', 'fr-FR,fr;q=0.9'), DEFAULT_LOCALE)
  assert.equal(pickLocale(undefined, undefined), DEFAULT_LOCALE)
})

test('locale and theme guards only accept supported values', () => {
  assert.equal(isLocale('zh-CN'), true)
  assert.equal(isLocale('en'), true)
  assert.equal(isLocale('fr'), false)

  assert.equal(isThemeMode('light'), true)
  assert.equal(isThemeMode('dark'), true)
  assert.equal(isThemeMode('system'), true)
  assert.equal(isThemeMode('sepia'), false)
})

test('resolveThemeMode resolves system mode from preferred color scheme', () => {
  assert.equal(resolveThemeMode('system', true), 'dark')
  assert.equal(resolveThemeMode('system', false), 'light')
  assert.equal(resolveThemeMode('dark', false), 'dark')
  assert.equal(resolveThemeMode('light', true), 'light')
})

test('getNextThemeMode makes the first click from system visually change the theme', () => {
  assert.equal(getNextThemeMode('system', false), 'dark')
  assert.equal(getNextThemeMode('system', true), 'light')
  assert.equal(getNextThemeMode('dark', true), 'light')
  assert.equal(getNextThemeMode('light', false), 'system')
})
