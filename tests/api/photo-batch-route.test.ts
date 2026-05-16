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
