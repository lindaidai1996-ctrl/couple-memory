import assert from 'node:assert/strict'
import test from 'node:test'

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/couple-memory-test'

async function loadProfileRoute() {
  process.env.DATABASE_URL = DATABASE_URL
  return import('../../../src/app/api/users/me/profile/route')
}

test('createProfileGetHandler returns unauthorized when session is missing', async () => {
  const { createProfileGetHandler } = await loadProfileRoute()

  const handler = createProfileGetHandler({
    auth: async () => null,
    prisma: {
      user: {
        findUnique: async () => {
          throw new Error('should not query user when unauthorized')
        },
      },
    },
  })

  const response = await handler()

  assert.equal(response.status, 401)
  const payload = await response.json()
  assert.equal(payload.error.code, 'UNAUTHORIZED')
  assert.equal(payload.error.message, 'Unauthorized')
  assert.equal(payload.error.retryable, false)
  assert.equal(typeof payload.error.requestId, 'string')
  assert.ok(payload.error.requestId.length > 0)
})

test('createProfilePatchHandler updates current user avatar', async () => {
  const { createProfilePatchHandler } = await loadProfileRoute()
  let updateArgs: unknown

  const handler = createProfilePatchHandler({
    auth: async () => ({ user: { id: 'user-1' } }),
    prisma: {
      user: {
        update: async (args: unknown) => {
          updateArgs = args
          return {
            id: 'user-1',
            email: 'alice@example.com',
            name: 'Alice',
            avatar: 'https://cdn.example.com/avatar.jpg',
          }
        },
      },
    },
  })

  const response = await handler(new Request('http://localhost/api/users/me/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar: 'https://cdn.example.com/avatar.jpg' }),
  }))

  assert.equal(response.status, 200)
  assert.deepEqual(updateArgs, {
    where: { id: 'user-1' },
    data: { avatar: 'https://cdn.example.com/avatar.jpg' },
    select: { id: true, email: true, name: true, avatar: true },
  })
  assert.deepEqual(await response.json(), {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    avatar: 'https://cdn.example.com/avatar.jpg',
  })
})

test('createProfilePatchHandler rejects update when avatar is omitted', async () => {
  const { createProfilePatchHandler } = await loadProfileRoute()

  const handler = createProfilePatchHandler({
    auth: async () => ({ user: { id: 'user-1' } }),
    prisma: {
      user: {
        update: async () => {
          throw new Error('should not update when avatar is omitted')
        },
      },
    },
  })

  const response = await handler(new Request('http://localhost/api/users/me/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }))

  assert.equal(response.status, 400)
  const payload = await response.json()
  assert.equal(payload.error.code, 'AVATAR_REQUIRED')
  assert.equal(payload.error.message, 'avatar is required')
  assert.equal(payload.error.retryable, false)
  assert.equal(typeof payload.error.requestId, 'string')
  assert.ok(payload.error.requestId.length > 0)
})
