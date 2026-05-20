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
