import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicReviewSections,
  buildPublicReviewUiText,
} from '../../src/app/story/[slug]/review/page'

test('buildPublicReviewUiText exposes translated review page copy', () => {
  const uiText = buildPublicReviewUiText(key => key)

  assert.equal(uiText.back, 'back')
  assert.equal(uiText.title, 'title')
  assert.equal(uiText.subtitle, 'subtitle')
  assert.equal(uiText.yearlyTitle, 'yearlyTitle')
  assert.equal(uiText.anniversaryTitle, 'anniversaryTitle')
})

test('buildPublicReviewSections returns yearly and anniversary slots', () => {
  const sections = buildPublicReviewSections({
    yearlyReview: null,
    anniversaryReview: {
      id: 'review-2',
      type: 'ANNIVERSARY',
      label: '2',
      title: '第 2 周年回顾',
      subtitle: null,
      summary: 'summary',
      closing: 'closing',
      coverPhotoUrl: null,
      status: 'READY',
      publishedAt: null,
      highlights: [],
    },
  })

  assert.equal(sections.length, 2)
  assert.equal(sections[1].review?.title, '第 2 周年回顾')
})
