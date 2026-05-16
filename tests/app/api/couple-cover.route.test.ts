import assert from 'node:assert/strict'
import test from 'node:test'

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/couple-memory-test'

async function loadCoupleRoute() {
  process.env.DATABASE_URL = DATABASE_URL
  return import('../../../src/app/api/couples/[coupleId]/route')
}

async function loadMineRoute() {
  process.env.DATABASE_URL = DATABASE_URL
  return import('../../../src/app/api/couples/mine/route')
}

test('createCoupleGetHandler includes cover fields in response payload', async () => {
  const { createCoupleGetHandler } = await loadCoupleRoute()

  const handler = createCoupleGetHandler({
    prisma: {
      couple: {
        findUnique: async () => ({
          id: 'couple-1',
          name: 'Our Space',
          slug: 'our-space',
          coverMode: 'UPLOAD',
          coverPhotoId: 'photo-9',
          coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
          members: [],
          _count: { albums: 4, milestones: 7 },
        }),
      },
      photo: {
        count: async () => 12,
      },
    },
  })

  const response = await handler(new Request('http://localhost/api/couples/couple-1'), {
    coupleUser: { coupleId: 'couple-1' },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'couple-1',
    name: 'Our Space',
    slug: 'our-space',
    coverMode: 'UPLOAD',
    coverPhotoId: 'photo-9',
    coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    members: [],
    _count: { albums: 4, milestones: 7 },
    stats: {
      photoCount: 12,
      albumCount: 4,
      milestoneCount: 7,
    },
  })
})

test('createCouplePatchHandler persists cover fields', async () => {
  const { createCouplePatchHandler } = await loadCoupleRoute()
  let updateArgs: unknown

  const handler = createCouplePatchHandler({
    prisma: {
      couple: {
        findUnique: async () => null,
        update: async (args: unknown) => {
          updateArgs = args
          return {
            id: 'couple-1',
            name: 'Our Space',
            slug: 'our-space',
            coverMode: 'UPLOAD',
            coverPhotoId: null,
            coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
          }
        },
      },
    },
  })

  const response = await handler(new Request('http://localhost/api/couples/couple-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Our Space',
      slug: 'our-space',
      coverMode: 'UPLOAD',
      coverPhotoId: null,
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    }),
  }), {
    coupleUser: { coupleId: 'couple-1' },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(updateArgs, {
    where: { id: 'couple-1' },
    data: {
      name: 'Our Space',
      slug: 'our-space',
      coverMode: 'UPLOAD',
      coverPhotoId: null,
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    },
  })
  assert.deepEqual(await response.json(), {
    id: 'couple-1',
    name: 'Our Space',
    slug: 'our-space',
    coverMode: 'UPLOAD',
    coverPhotoId: null,
    coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
  })
})

test('createMineGetHandler returns cover fields for current couple', async () => {
  const { createMineGetHandler } = await loadMineRoute()

  const handler = createMineGetHandler({
    auth: async () => ({ user: { id: 'user-1' } }),
    prisma: {
      coupleUser: {
        findFirst: async () => ({
          couple: {
            id: 'couple-1',
            name: 'Our Space',
            slug: 'our-space',
            coverMode: 'PHOTO',
            coverPhotoId: 'photo-9',
            coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
          },
        }),
      },
    },
    logger: {
      warn: () => {},
    },
  })

  const response = await handler()

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'couple-1',
    name: 'Our Space',
    slug: 'our-space',
    coverMode: 'PHOTO',
    coverPhotoId: 'photo-9',
    coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
  })
})
