import assert from 'node:assert/strict'
import test from 'node:test'

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

test('album chapter move route module exposes move handler', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/move/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterMoveHandler === 'function')
})

test('createPostAlbumChapterMoveHandler moves selected photos into another chapter', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/move/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterMoveHandler === 'function')

  const moveCalls: Array<Record<string, unknown>> = []
  const handler = mod.createPostAlbumChapterMoveHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({ id: 'album_1' }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1' },
          { id: 'photo_2' },
        ]),
        updateMany: async (args: Record<string, unknown>) => {
          moveCalls.push(args)
          return { count: 2 }
        },
      },
      albumChapter: {
        findFirst: async () => ({ id: 'chapter_2' }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/move', {
      action: 'MOVE',
      targetChapterId: 'chapter_2',
      photoIds: ['photo_1', 'photo_2'],
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(moveCalls, [{
    where: {
      id: { in: ['photo_1', 'photo_2'] },
      albumId: 'album_1',
    },
    data: {
      chapterId: 'chapter_2',
    },
  }])
})

test('createPostAlbumChapterMoveHandler ungroups selected photos back to album root', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/move/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterMoveHandler === 'function')

  const ungroupCalls: Array<Record<string, unknown>> = []
  const handler = mod.createPostAlbumChapterMoveHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({ id: 'album_1' }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1' },
        ]),
        updateMany: async (args: Record<string, unknown>) => {
          ungroupCalls.push(args)
          return { count: 1 }
        },
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/move', {
      action: 'UNGROUP',
      photoIds: ['photo_1'],
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.deepEqual(ungroupCalls, [{
    where: {
      id: { in: ['photo_1'] },
      albumId: 'album_1',
    },
    data: {
      chapterId: null,
    },
  }])
})

test('createPostAlbumChapterMoveHandler rejects photos outside the album', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/move/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterMoveHandler === 'function')

  const handler = mod.createPostAlbumChapterMoveHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({ id: 'album_1' }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1' },
        ]),
        updateMany: async () => ({ count: 1 }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/move', {
      action: 'UNGROUP',
      photoIds: ['photo_1', 'photo_2'],
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: {
      code: 'PHOTO_NOT_IN_ALBUM',
      message: 'Some photos do not belong to the album',
      retryable: false,
    },
  })
})
