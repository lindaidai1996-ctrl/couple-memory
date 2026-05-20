import assert from 'node:assert/strict'
import test from 'node:test'

function createJsonRequest(url: string, body: unknown = {}) {
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

test('createPhotoAssistHandler returns ungrouped suggestions for a photo without chapter', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/photos/[photoId]/assist/route').catch(() => null)
  assert.ok(mod && typeof mod.createPhotoAssistHandler === 'function')

  const handler = mod.createPhotoAssistHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          momentContext: '想留住这一刻',
          momentPromptAnswer: null,
          aiScene: '日落散步',
          locationName: '青岛',
          chapter: null,
        }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/assist'),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    suggestions: [
      '想留住这一刻',
      '想把这一刻留下来，在青岛。',
    ],
  })
})

test('createPhotoAssistHandler returns chapter-aware suggestions for a grouped photo', async () => {
  const mod = await import('../../src/app/api/couples/[coupleId]/photos/[photoId]/assist/route').catch(() => null)
  assert.ok(mod && typeof mod.createPhotoAssistHandler === 'function')

  const handler = mod.createPhotoAssistHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          momentContext: null,
          momentPromptAnswer: null,
          aiScene: '海边散步',
          locationName: '青岛',
          chapter: { title: '第一次一起看海' },
        }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/assist'),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    suggestions: [
      '这张照片属于“第一次一起看海”这一段回忆。',
      '它可以在章节里作为一个更具体的瞬间表达。',
    ],
  })
})
