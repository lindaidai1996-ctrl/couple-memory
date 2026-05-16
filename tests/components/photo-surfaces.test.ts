import assert from 'node:assert/strict'
import test from 'node:test'

import { photoDetailImageSurfaceClass } from '../../src/components/photo-detail-modal'
import { photoCardSurfaceClass } from '../../src/components/photo-card'

test('album detail photo cards use the warm skeleton surface', () => {
  assert.equal(photoCardSurfaceClass, 'bg-warm-skeleton-base')
})

test('photo detail modal image area uses the warm skeleton surface', () => {
  assert.equal(photoDetailImageSurfaceClass, 'bg-warm-skeleton-base')
})
