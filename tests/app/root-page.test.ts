import assert from 'node:assert/strict'
import test from 'node:test'

import Home from '../../src/app/page'

test('root page redirects visitors to /login', async () => {
  await assert.rejects(
    Home(),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.includes('NEXT_REDIRECT') &&
      error.digest.includes('/login')
  )
})
