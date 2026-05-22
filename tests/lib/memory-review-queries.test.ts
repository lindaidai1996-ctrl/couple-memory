import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDashboardReviewCard,
  getPublicMemoryReviewsByCoupleId,
} from '../../src/lib/memory-reviews/review-queries'
import { mapMemoryReview } from '../../src/lib/memory-reviews/review-mappers'

test('mapMemoryReview converts payload highlights into stable UI items', () => {
  const review = mapMemoryReview({
    id: 'review-1',
    type: 'YEARLY',
    scopeKey: 'YEARLY:2025',
    year: 2025,
    anniversaryYear: null,
    periodStart: new Date('2025-01-01T00:00:00.000Z'),
    periodEnd: new Date('2026-01-01T00:00:00.000Z'),
    title: '2025 年回顾',
    subtitle: '一起走过的一年',
    summary: '这一年，我们开始把日常整理成故事。',
    closing: '故事还会继续。',
    coverPhotoUrl: '/cover.jpg',
    status: 'READY',
    publishedAt: new Date('2025-12-20T00:00:00.000Z'),
    payload: {
      highlights: [
        {
          id: 'h1',
          title: '春天见面',
          narrative: '一起走进新的阶段。',
          date: '2025-03-02T00:00:00.000Z',
        },
      ],
    },
  })

  assert.equal(review.highlights.length, 1)
  assert.equal(review.label, '2025')
})

test('buildDashboardReviewCard splits yearly and anniversary reviews', () => {
  const card = buildDashboardReviewCard([
    {
      id: 'review-1',
      type: 'YEARLY',
      label: '2025',
      title: '2025 年回顾',
      subtitle: null,
      summary: 'summary',
      closing: 'closing',
      coverPhotoUrl: null,
      status: 'READY',
      publishedAt: null,
      highlights: [],
    },
  ])

  assert.equal(card.hasYearlyReview, true)
  assert.equal(card.hasAnniversaryReview, false)
})

test('getPublicMemoryReviewsByCoupleId filters out unpublished reviews', async () => {
  const reviews = await getPublicMemoryReviewsByCoupleId('couple-1', {
    memoryReview: {
      findMany: async () => [
        {
          id: 'review-1',
          type: 'YEARLY',
          scopeKey: 'YEARLY:2025',
          year: 2025,
          anniversaryYear: null,
          title: '2025 年回顾',
          subtitle: null,
          summary: 'summary',
          closing: 'closing',
          coverPhotoUrl: null,
          status: 'READY',
          publishedAt: new Date('2025-12-20T00:00:00.000Z'),
          payload: { highlights: [] },
        },
      ],
      findFirst: async () => null,
    },
  } as never)

  assert.equal(reviews.yearlyReview?.title, '2025 年回顾')
  assert.equal(reviews.anniversaryReview, null)
})
