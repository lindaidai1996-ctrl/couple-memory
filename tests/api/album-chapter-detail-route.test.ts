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

test('album chapter detail route module exposes chapter detail handlers', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/route').catch(() => null)
  assert.ok(mod && typeof mod.createGetAlbumChapterHandler === 'function')
  assert.ok(typeof mod.createPatchAlbumChapterHandler === 'function')
  assert.ok(typeof mod.createDeleteAlbumChapterHandler === 'function')
})

test('createGetAlbumChapterHandler returns chapter detail with photos', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/route').catch(() => null)
  assert.ok(mod && typeof mod.createGetAlbumChapterHandler === 'function')

  const handler = mod.createGetAlbumChapterHandler({
    prismaClient: {
      albumChapter: {
        findFirst: async () => ({
          id: 'chapter_1',
          albumId: 'album_1',
          title: '第一次一起看海',
          backgroundNote: '那天风很大',
          aiSummary: '我们在风很大的海边待了很久。',
          photos: [
            { id: 'photo_1', fileName: '1.jpg' },
            { id: 'photo_2', fileName: '2.jpg' },
          ],
        }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/chapter_1'),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1', chapterId: 'chapter_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'chapter_1',
    albumId: 'album_1',
    title: '第一次一起看海',
    backgroundNote: '那天风很大',
    aiSummary: '我们在风很大的海边待了很久。',
    photos: [
      { id: 'photo_1', fileName: '1.jpg' },
      { id: 'photo_2', fileName: '2.jpg' },
    ],
  })
})

test('createPatchAlbumChapterHandler updates title and background note', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/route').catch(() => null)
  assert.ok(mod && typeof mod.createPatchAlbumChapterHandler === 'function')

  const updateCalls: Array<Record<string, unknown>> = []
  const handler = mod.createPatchAlbumChapterHandler({
    prismaClient: {
      albumChapter: {
        findFirst: async () => ({
          id: 'chapter_1',
        }),
        update: async (args: Record<string, unknown>) => {
          updateCalls.push(args)
          return {
            id: 'chapter_1',
            title: '新的标题',
            backgroundNote: '补一句背景',
          }
        },
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/chapter_1', {
      method: 'PATCH',
      body: {
        title: '新的标题',
        backgroundNote: '补一句背景',
      },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1', chapterId: 'chapter_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'chapter_1',
    title: '新的标题',
    backgroundNote: '补一句背景',
  })
  assert.deepEqual(updateCalls, [{
    where: { id: 'chapter_1' },
    data: {
      title: '新的标题',
      backgroundNote: '补一句背景',
    },
  }])
})

test('createDeleteAlbumChapterHandler deletes a chapter and ungroups its photos', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/route').catch(() => null)
  assert.ok(mod && typeof mod.createDeleteAlbumChapterHandler === 'function')

  const calls: string[] = []
  const handler = mod.createDeleteAlbumChapterHandler({
    prismaClient: {
      albumChapter: {
        findFirst: async () => ({
          id: 'chapter_1',
        }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) => callback({
        photo: {
          updateMany: async () => {
            calls.push('photo.updateMany')
            return { count: 2 }
          },
        },
        albumChapter: {
          delete: async () => {
            calls.push('albumChapter.delete')
            return { id: 'chapter_1' }
          },
        },
      } as never),
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/chapter_1', {
      method: 'DELETE',
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1', chapterId: 'chapter_1' }
  )

  assert.equal(response.status, 204)
  assert.deepEqual(calls, ['photo.updateMany', 'albumChapter.delete'])
})
