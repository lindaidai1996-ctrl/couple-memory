import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPublicMemoryReviewsHandler,
} from '../../src/app/api/public/[slug]/memory-reviews/route'

test('public memory review route returns split published review payload', async () => {
  const handler = createPublicMemoryReviewsHandler({
    prismaClient: {
      memoryReview: {
        findMany: async () => [
          {
            id: 'review_1',
            type: 'YEARLY',
            scopeKey: 'YEARLY:2026',
            year: 2026,
            anniversaryYear: null,
            title: '2026 年回顾',
            subtitle: null,
            summary: 'summary',
            closing: 'closing',
            coverPhotoUrl: null,
            status: 'READY',
            publishedAt: new Date('2026-05-22T00:00:00.000Z'),
            payload: { highlights: [] },
          },
        ],
      },
    } as never,
  })

  const response = await handler(new Request('http://localhost'), {
    couple: { id: 'couple_1' },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.yearlyReview.title, '2026 年回顾')
  assert.equal(payload.anniversaryReview, null)
})
