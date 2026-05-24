import assert from 'node:assert/strict'
import test from 'node:test'

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

test('createGetAlbumHandler returns chapters plus ungrouped photos', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/route')
  assert.equal(typeof mod.createGetAlbumHandler, 'function')

  const handler = mod.createGetAlbumHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({
          id: 'album_1',
          title: '2024',
          description: '我们恋爱第五年',
          chapters: [
            {
              id: 'chapter_1',
              title: '第一次一起看海',
              backgroundNote: '那天风很大',
              sortOrder: 1,
              photos: [
                { id: 'photo_1', fileName: '1.jpg' },
              ],
            },
          ],
          photos: [
            { id: 'photo_2', fileName: '2.jpg' },
            { id: 'photo_3', fileName: '3.jpg' },
          ],
        }),
      },
    } as never,
  })

  const response = await handler(
    createRequest('/api/couples/couple_1/albums/album_1'),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'album_1',
    title: '2024',
    description: '我们恋爱第五年',
    chapters: [
      {
        id: 'chapter_1',
        title: '第一次一起看海',
        backgroundNote: '那天风很大',
        sortOrder: 1,
        photos: [
          { id: 'photo_1', fileName: '1.jpg' },
        ],
      },
    ],
    ungroupedPhotos: [
      { id: 'photo_2', fileName: '2.jpg' },
      { id: 'photo_3', fileName: '3.jpg' },
    ],
  })
})

test('createPatchAlbumHandler updates only allowed album fields', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/route')
  assert.equal(typeof mod.createPatchAlbumHandler, 'function')

  let updateManyArgs: unknown

  const handler = mod.createPatchAlbumHandler({
    prismaClient: {
      album: {
        findFirst: async () => null,
        updateMany: async (args: Record<string, unknown>) => {
          updateManyArgs = args
          return { count: 1 }
        },
        findUnique: async () => ({
          id: 'album_1',
          title: '2024 夏天',
          description: null,
          coupleId: 'couple_1',
        }),
        deleteMany: async () => ({}),
      },
    } as never,
  })

  const response = await handler(
    new Request('http://localhost/api/couples/couple_1/albums/album_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: ' 2024 夏天 ',
        description: '   ',
        coupleId: 'other_couple',
        sortOrder: 999,
      }),
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(updateManyArgs, {
    where: { id: 'album_1', coupleId: 'couple_1' },
    data: {
      title: '2024 夏天',
      description: null,
    },
  })
  assert.deepEqual(await response.json(), {
    id: 'album_1',
    title: '2024 夏天',
    description: null,
    coupleId: 'couple_1',
  })
})

test('createPatchAlbumHandler returns 404 when album does not exist', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/route')
  assert.equal(typeof mod.createPatchAlbumHandler, 'function')

  const handler = mod.createPatchAlbumHandler({
    prismaClient: {
      album: {
        findFirst: async () => null,
        updateMany: async () => ({ count: 0 }),
        findUnique: async () => null,
        deleteMany: async () => ({}),
      },
    } as never,
  })

  const response = await handler(
    new Request('http://localhost/api/couples/couple_1/albums/album_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '2024 夏天',
      }),
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: 'Not found' })
})

test('createDeleteAlbumHandler removes dependent records before deleting the album', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/route')
  assert.equal(typeof mod.createDeleteAlbumHandler, 'function')

  const calls: string[] = []

  const handler = mod.createDeleteAlbumHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({
          id: 'album_1',
          title: '2024',
          description: null,
        }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) =>
        callback({
          photoAIVariant: {
            deleteMany: async () => {
              calls.push('photoAIVariant.deleteMany')
              return { count: 2 }
            },
          },
          pipelineRun: {
            deleteMany: async () => {
              calls.push('pipelineRun.deleteMany')
              return { count: 2 }
            },
          },
          photo: {
            deleteMany: async () => {
              calls.push('photo.deleteMany')
              return { count: 2 }
            },
          },
          albumChapter: {
            deleteMany: async () => {
              calls.push('albumChapter.deleteMany')
              return { count: 1 }
            },
          },
          album: {
            delete: async () => {
              calls.push('album.delete')
              return {}
            },
          },
        } as never),
    } as never,
  })

  const response = await handler(
    new Request('http://localhost/api/couples/couple_1/albums/album_1', {
      method: 'DELETE',
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 204)
  assert.deepEqual(calls, [
    'photoAIVariant.deleteMany',
    'pipelineRun.deleteMany',
    'photo.deleteMany',
    'albumChapter.deleteMany',
    'album.delete',
  ])
})
