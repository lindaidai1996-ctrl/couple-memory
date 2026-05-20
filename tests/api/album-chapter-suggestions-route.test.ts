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

test('createChapterSuggestionsHandler returns one or two weak title suggestions', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/albums/[albumId]/chapters/suggestions/route').catch(() => null)
  assert.ok(mod && typeof mod.createChapterSuggestionsHandler === 'function')

  const handler = mod.createChapterSuggestionsHandler({
    prismaClient: {
      album: {
        findFirst: async () => ({
          id: 'album_1',
          title: '2024',
        }),
      },
      photo: {
        findMany: async () => ([
          { id: 'photo_1', aiScene: '海边散步', locationName: '青岛' },
          { id: 'photo_2', aiScene: '海边散步', locationName: '青岛' },
        ]),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/albums/album_1/chapters/suggestions', {
      photoIds: ['photo_1', 'photo_2'],
    }),
    createAuthContext(),
    { coupleId: 'couple_1', albumId: 'album_1' }
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(Array.isArray(payload.suggestions), true)
  assert.equal(payload.suggestions.length >= 1 && payload.suggestions.length <= 2, true)
})
