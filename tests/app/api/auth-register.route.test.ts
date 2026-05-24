import assert from 'node:assert/strict'
import test from 'node:test'

async function loadRegisterRoute() {
  return import('../../../src/app/api/auth/register/route')
}

test('createRegisterHandler assigns a default avatar when creating a user', async () => {
  const { createRegisterHandler } = await loadRegisterRoute()
  let createArgs: unknown

  const handler = createRegisterHandler({
    hashPassword: async () => 'hashed-password',
    now: () => 1748044800000,
    prisma: {
      user: {
        findUnique: async () => null,
        create: async (args: unknown) => {
          createArgs = args
          return {
            id: 'user-1',
            email: 'linda@example.com',
            name: 'Lindaidai',
            avatar: '/avatars/default/avatar-03.svg',
            couples: [
              {
                couple: {
                  id: 'couple-1',
                  slug: 'couple-mb1gqo00',
                  name: 'Lindaidai的空间',
                },
              },
            ],
          }
        },
      },
    },
    logger: {
      info() {},
      warn() {},
      error() {},
    },
  })

  const response = await handler(new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'linda@example.com',
      password: 'secret123',
      name: 'Lindaidai',
    }),
  }))

  assert.equal(response.status, 201)
  assert.deepEqual(createArgs, {
    data: {
      email: 'linda@example.com',
      passwordHash: 'hashed-password',
      name: 'Lindaidai',
      avatar: '/avatars/default/avatar-03.svg',
      couples: {
        create: {
          role: 'OWNER',
          couple: {
            create: {
              slug: 'couple-mb1gqo00',
              name: 'Lindaidai的空间',
            },
          },
        },
      },
    },
    include: { couples: { include: { couple: true } } },
  })

  assert.deepEqual(await response.json(), {
    user: {
      id: 'user-1',
      email: 'linda@example.com',
      name: 'Lindaidai',
      avatar: '/avatars/default/avatar-03.svg',
    },
    couple: {
      id: 'couple-1',
      slug: 'couple-mb1gqo00',
      name: 'Lindaidai的空间',
    },
  })
})
