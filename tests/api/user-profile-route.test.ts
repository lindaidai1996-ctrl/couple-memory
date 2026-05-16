import assert from 'node:assert/strict'
import test from 'node:test'

import { createProfilePatchHandler } from '../../src/app/api/users/me/profile/route'

function createJsonRequest(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

test('createProfilePatchHandler rejects avatar update when no avatar provided', async () => {
  const handler = createProfilePatchHandler({
    auth: async () => ({
      user: {
        id: 'user_1',
      },
    }),
    prisma: {
      user: {
        update: async () => {
          throw new Error('update should not be called')
        },
      },
    },
  })

  const response = await handler(
    createJsonRequest('/api/users/me/profile', {})
  )

  assert.equal(response.status, 400)
  const payload = await response.json()

  assert.equal(payload.error.code, 'AVATAR_REQUIRED')
  assert.equal(payload.error.message, 'avatar is required')
  assert.equal(payload.error.retryable, false)
  assert.equal(typeof payload.error.requestId, 'string')
  assert.ok(payload.error.requestId.length > 0)
})
