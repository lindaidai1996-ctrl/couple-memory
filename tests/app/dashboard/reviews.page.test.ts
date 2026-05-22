import assert from 'node:assert/strict'
import test from 'node:test'

import { buildReviewsUiText } from '../../../src/app/(dashboard)/reviews/page'

test('buildReviewsUiText exposes translated review-management copy', () => {
  const uiText = buildReviewsUiText(key => key)

  assert.equal(uiText.title, 'title')
  assert.equal(uiText.subtitle, 'subtitle')
  assert.equal(uiText.generateYearly, 'generateYearly')
  assert.equal(uiText.generateAnniversary, 'generateAnniversary')
  assert.equal(uiText.empty, 'empty')
})
