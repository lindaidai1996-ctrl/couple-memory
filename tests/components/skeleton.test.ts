import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSkeletonGradient } from '../../src/components/skeleton/skeleton'

test('buildSkeletonGradient uses warm theme skeleton tokens', () => {
  assert.equal(
    buildSkeletonGradient('warm'),
    'linear-gradient(90deg, var(--color-warm-skeleton-base) 25%, var(--color-warm-skeleton-highlight) 50%, var(--color-warm-skeleton-base) 75%)'
  )
})

test('buildSkeletonGradient uses film theme skeleton tokens without hard-coded dark stops', () => {
  const gradient = buildSkeletonGradient('film')

  assert.equal(
    gradient,
    'linear-gradient(90deg, var(--color-film-skeleton-base) 25%, var(--color-film-skeleton-highlight) 50%, var(--color-film-skeleton-base) 75%)'
  )
  assert.equal(gradient.includes('#2e2e2e'), false)
})
