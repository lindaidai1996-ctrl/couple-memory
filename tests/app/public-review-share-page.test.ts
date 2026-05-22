import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicReviewShareCard,
  buildPublicReviewShareUiText,
} from '../../src/app/s/[slug]/review/share/[type]/page'

test('buildPublicReviewShareUiText exposes translated share-card copy', () => {
  const uiText = buildPublicReviewShareUiText(key => key)

  assert.equal(uiText.back, 'back')
  assert.equal(uiText.eyebrow, 'eyebrow')
  assert.equal(uiText.closingLabel, 'closingLabel')
  assert.equal(uiText.highlightsLabel, 'highlightsLabel')
})

test('buildPublicReviewShareCard keeps only the first three highlights', () => {
  const card = buildPublicReviewShareCard({
    title: '2026 年回顾',
    subtitle: '一起走过的一年',
    summary: 'summary',
    closing: 'closing',
    highlights: [
      { id: '1', title: 'A', narrative: 'a', date: '', locationName: null },
      { id: '2', title: 'B', narrative: 'b', date: '', locationName: null },
      { id: '3', title: 'C', narrative: 'c', date: '', locationName: null },
      { id: '4', title: 'D', narrative: 'd', date: '', locationName: null },
    ],
  })

  assert.equal(card.highlights.length, 3)
  assert.deepEqual(card.highlights.map(item => item.id), ['1', '2', '3'])
})
