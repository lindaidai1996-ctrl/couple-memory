import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createGetMemoryReviewDetailHandler,
} from '../../src/app/api/couples/[coupleId]/memory-reviews/[reviewId]/route'
import {
  createListMemoryReviewsHandler,
} from '../../src/app/api/couples/[coupleId]/memory-reviews/route'

function createAuthContext(coupleId = 'couple_1') {
  return {
    userId: 'user_1',
    coupleUser: {
      coupleId,
    },
  } as never
}

test('list route returns mapped review items', async () => {
  const handler = createListMemoryReviewsHandler({
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

  const response = await handler(new Request('http://localhost'), createAuthContext())

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.reviews[0].title, '2026 年回顾')
})

test('detail route returns 404 for missing review', async () => {
  const handler = createGetMemoryReviewDetailHandler({
    prismaClient: {
      memoryReview: {
        findFirst: async () => null,
      },
    } as never,
  })

  const response = await handler(
    new Request('http://localhost'),
    createAuthContext(),
    { reviewId: 'missing' }
  )

  assert.equal(response.status, 404)
})
