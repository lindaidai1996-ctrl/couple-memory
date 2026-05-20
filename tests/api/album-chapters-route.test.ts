import assert from 'node:assert/strict'
import test from 'node:test'

function createJsonRequest(url: string, init?: { method?: string; body?: unknown }) {
  return new Request(`http://localhost${url}`, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
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

test('album chapters route module exposes a factory for creating chapters', async () => {
  let mod: null | Record<string, unknown> = null

  try {
    mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/route')
  } catch {
    mod = null
  }

  assert.ok(mod && typeof mod.createPostAlbumChapterHandler === 'function')
})

test('createPostAlbumChapterHandler creates a chapter and assigns selected photos', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterHandler === 'function')

  const chapterCreateCalls: Array<Record<string, unknown>> = []
  const photoUpdateCalls: Array<Record<string, unknown>> = []

  const handler = mod.createPostAlbumChapterHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({
          id: 'album_1',
          chapters: [{ sortOrder: 2 }],
        }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1' },
          { id: 'photo_2' },
        ]),
      },
      albumChapter: {
        findUnique: async () => ({
          id: 'chapter_3',
          albumId: 'album_1',
          title: '第一次一起看海',
          backgroundNote: '那天风很大，但我们待了很久',
          sortOrder: 3,
          photos: [
            { id: 'photo_1' },
            { id: 'photo_2' },
          ],
        }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) => callback({
        albumChapter: {
          create: async (args: Record<string, unknown>) => {
            chapterCreateCalls.push(args)
            return {
              id: 'chapter_3',
            }
          },
          findUnique: async () => ({
            id: 'chapter_3',
            albumId: 'album_1',
            title: '第一次一起看海',
            backgroundNote: '那天风很大，但我们待了很久',
            sortOrder: 3,
            photos: [
              { id: 'photo_1' },
              { id: 'photo_2' },
            ],
          }),
        },
        photo: {
          updateMany: async (args: Record<string, unknown>) => {
            photoUpdateCalls.push(args)
            return { count: 2 }
          },
        },
      } as never),
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters', {
      method: 'POST',
      body: {
        title: '第一次一起看海',
        backgroundNote: '那天风很大，但我们待了很久',
        photoIds: ['photo_1', 'photo_2'],
      },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    id: 'chapter_3',
    albumId: 'album_1',
    title: '第一次一起看海',
    backgroundNote: '那天风很大，但我们待了很久',
    sortOrder: 3,
    photos: [
      { id: 'photo_1' },
      { id: 'photo_2' },
    ],
  })
  assert.deepEqual(chapterCreateCalls, [{
    data: {
      albumId: 'album_1',
      title: '第一次一起看海',
      backgroundNote: '那天风很大，但我们待了很久',
      sortOrder: 3,
    },
  }])
  assert.deepEqual(photoUpdateCalls, [{
    where: {
      id: { in: ['photo_1', 'photo_2'] },
      albumId: 'album_1',
    },
    data: {
      chapterId: 'chapter_3',
    },
  }])
})

test('createPostAlbumChapterHandler allows creating a chapter with a single photo', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterHandler === 'function')

  const handler = mod.createPostAlbumChapterHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({
          id: 'album_1',
          chapters: [],
        }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1' },
        ]),
      },
      albumChapter: {
        findUnique: async () => ({
          id: 'chapter_1',
          albumId: 'album_1',
          title: '想留下来的这一刻',
          backgroundNote: null,
          sortOrder: 1,
          photos: [{ id: 'photo_1' }],
        }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) => callback({
        albumChapter: {
          create: async () => ({ id: 'chapter_1' }),
          findUnique: async () => ({
            id: 'chapter_1',
            albumId: 'album_1',
            title: '想留下来的这一刻',
            backgroundNote: null,
            sortOrder: 1,
            photos: [{ id: 'photo_1' }],
          }),
        },
        photo: {
          updateMany: async () => ({ count: 1 }),
        },
      } as never),
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters', {
      method: 'POST',
      body: {
        title: '想留下来的这一刻',
        photoIds: ['photo_1'],
      },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 201)
  assert.equal((await response.json()).id, 'chapter_1')
})

test('createPostAlbumChapterHandler rejects photos from another album', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/route').catch(() => null)
  assert.ok(mod && typeof mod.createPostAlbumChapterHandler === 'function')

  const handler = mod.createPostAlbumChapterHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({
          id: 'album_1',
          chapters: [],
        }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1' },
        ]),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters', {
      method: 'POST',
      body: {
        title: '第一次一起看海',
        photoIds: ['photo_1', 'photo_2'],
      },
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
