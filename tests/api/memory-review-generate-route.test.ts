import assert from 'node:assert/strict'
import test from 'node:test'

import { createGenerateMemoryReviewHandler } from '../../src/app/api/couples/[coupleId]/memory-reviews/generate/route'

function createRequest(body: unknown) {
  return new Request('http://localhost/api/couples/couple_1/memory-reviews/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createAuthContext() {
  return {
    userId: 'user_1',
    coupleUser: {
      coupleId: 'couple_1',
      role: 'OWNER',
    },
  } as never
}

test('POST yearly review creates a ready review record', async () => {
  let createdArgs: unknown

  const handler = createGenerateMemoryReviewHandler({
    prismaClient: {
      couple: {
        findUnique: async () => ({
          id: 'couple_1',
          name: 'Our Space',
          startDate: new Date('2024-05-01T00:00:00.000Z'),
          albums: [
            {
              id: 'album_1',
              title: '2026 春天',
              description: null,
              coverPhotoUrl: null,
              chapters: [],
            },
          ],
          milestones: [
            {
              id: 'ms_1',
              title: '春天见面',
              description: '一起走进新的阶段。',
              date: new Date('2026-03-01T00:00:00.000Z'),
              locationName: '广州',
              photo: { displayUrl: '/cover.jpg', thumbnailUrl: null },
            },
            {
              id: 'ms_2',
              title: '夜晚散步',
              description: null,
              date: new Date('2026-04-01T00:00:00.000Z'),
              locationName: '广州',
              photo: { displayUrl: null, thumbnailUrl: '/thumb.jpg' },
            },
            {
              id: 'ms_3',
              title: '一起出发',
              description: null,
              date: new Date('2026-05-01T00:00:00.000Z'),
              locationName: null,
              photo: null,
            },
          ],
        }),
      },
      memoryReview: {
        deleteMany: async () => ({}),
        create: async (args: unknown) => {
          createdArgs = args
          return { id: 'review_1', type: 'YEARLY' }
        },
      },
    } as never,
  })

  const response = await handler(
    createRequest({ type: 'YEARLY', year: 2026 }),
    createAuthContext()
  )

  assert.equal(response.status, 200)
  assert.equal((createdArgs as { data: { type: string } }).data.type, 'YEARLY')
  const body = await response.json()
  assert.equal(body.review.type, 'YEARLY')
})

test('POST anniversary review rejects when couple has no startDate', async () => {
  const handler = createGenerateMemoryReviewHandler({
    prismaClient: {
      couple: {
        findUnique: async () => ({
          id: 'couple_1',
          name: 'Our Space',
          startDate: null,
          albums: [],
          milestones: [],
        }),
      },
      memoryReview: {
        deleteMany: async () => ({}),
        create: async () => ({ id: 'review_1' }),
      },
    } as never,
  })

  const response = await handler(
    createRequest({ type: 'ANNIVERSARY', anniversaryYear: 1 }),
    createAuthContext()
  )

  assert.equal(response.status, 422)
})
