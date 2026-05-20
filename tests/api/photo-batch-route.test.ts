import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createBatchPhotoHandler,
  POST,
} from '../../src/app/api/couples/[coupleId]/photos/batch/route'

function createJsonRequest(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function createAuthContext(coupleId = 'couple_1') {
  return {
    userId: 'user_1',
    coupleUser: {
      coupleId,
    },
  } as never
}

test('createBatchPhotoHandler requires targetAlbumId for MOVE action', async () => {
  assert.equal(typeof POST, 'function')

  const handler = createBatchPhotoHandler()

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/batch', {
      action: 'MOVE',
      photoIds: ['photo_1'],
    }),
    createAuthContext()
  )

  assert.equal(response.status, 400)
  const payload = await response.json()

  assert.equal(payload.error.code, 'TARGET_ALBUM_REQUIRED')
  assert.equal(payload.error.message, 'targetAlbumId is required')
  assert.equal(payload.error.retryable, false)
  assert.equal(typeof payload.error.requestId, 'string')
  assert.ok(payload.error.requestId.length > 0)
})

test('createBatchPhotoHandler deletes photo dependencies before deleting photos', async () => {
  const calls: string[] = []

  const handler = createBatchPhotoHandler({
    prismaClient: {
      photo: {
        findMany: async (args: Record<string, unknown>) => {
          const where = args.where as { albumId?: string }
          if (where?.albumId) {
            return [{ id: 'photo_2', sortOrder: 2 }] as never
          }

          return [{ id: 'photo_1', albumId: 'album_1' }] as never
        },
      },
      album: {
        findFirst: async () => ({ id: 'album_1' }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) =>
        callback({
          photoAIVariant: {
            deleteMany: async () => {
              calls.push('photoAIVariant.deleteMany')
              return { count: 1 }
            },
          },
          pipelineRun: {
            deleteMany: async () => {
              calls.push('pipelineRun.deleteMany')
              return { count: 1 }
            },
          },
          photo: {
            deleteMany: async () => {
              calls.push('photo.deleteMany')
              return { count: 1 }
            },
            findMany: async () => {
              calls.push('photo.findMany')
              return [{ id: 'photo_2', sortOrder: 2 }]
            },
            update: async () => {
              calls.push('photo.update')
              return {}
            },
          },
          album: {
            findUnique: async () => ({
              id: 'album_1',
              coverMode: 'AUTO',
              coverPhotoId: null,
              photos: [],
            }),
            update: async () => {
              calls.push('album.update')
              return {}
            },
          },
        } as never),
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/batch', {
      action: 'DELETE',
      photoIds: ['photo_1'],
    }),
    createAuthContext()
  )

  assert.equal(response.status, 200)
  assert.deepEqual(calls.slice(0, 3), [
    'photoAIVariant.deleteMany',
    'pipelineRun.deleteMany',
    'photo.deleteMany',
  ])
})
