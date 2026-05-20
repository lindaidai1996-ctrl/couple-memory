import assert from 'node:assert/strict'
import test from 'node:test'

import { createGetPhotosHandler } from '../../src/app/api/couples/[coupleId]/photos/route'

function createRequest(url: string) {
  return new Request(`http://localhost${url}`)
}

function createAuthContext(coupleId = 'couple_1') {
  return {
    userId: 'user_1',
    coupleUser: {
      coupleId,
    },
  } as never
}

test('createGetPhotosHandler supports newest-first ordering', async () => {
  const findManyCalls: Array<Record<string, unknown>> = []

  const handler = createGetPhotosHandler({
    prismaClient: {
      photo: {
        findMany: async (args: Record<string, unknown>) => {
          findManyCalls.push(args)
          return [
            {
              id: 'photo_2',
              fileName: 'newer.jpg',
              status: 'READY',
              displayUrl: 'https://cdn.example.com/newer.jpg',
              thumbnailUrl: 'https://cdn.example.com/newer-thumb.jpg',
              sortOrder: 2,
              createdAt: '2026-05-02T00:00:00.000Z',
            },
          ] as never
        },
        count: async () => 1,
      },
      album: {
        findFirst: async () => null,
      },
    } as never,
    logger: {
      warn: () => undefined,
      error: () => undefined,
    } as never,
  })

  const response = await handler(
    createRequest('/api/couples/couple_1/photos?sort=desc&limit=12'),
    createAuthContext()
  )

  assert.equal(response.status, 200)
  assert.deepEqual(findManyCalls[0]?.orderBy, [{ sortOrder: 'desc' }, { createdAt: 'desc' }])
  assert.deepEqual(await response.json(), {
    photos: [
      {
        id: 'photo_2',
        fileName: 'newer.jpg',
        status: 'READY',
        displayUrl: 'https://cdn.example.com/newer.jpg',
        thumbnailUrl: 'https://cdn.example.com/newer-thumb.jpg',
        sortOrder: 2,
        createdAt: '2026-05-02T00:00:00.000Z',
        isAlbumCover: false,
        canBeCover: true,
      },
    ],
    total: 1,
    page: 1,
    limit: 12,
  })
})
