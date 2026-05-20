import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDeletePhotoHandler,
  createGetPhotoHandler,
  createPatchPhotoHandler,
} from '../../src/app/api/couples/[coupleId]/photos/[photoId]/route'

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

test('createGetPhotoHandler returns latest run plus caption and layout variants', async () => {
  const handler = createGetPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          status: 'READY',
          fileName: 'IMG_0001.JPG',
          aiCaption: 'Sunset walk',
          aiLayout: 'grid',
          aiVariants: [
            {
              id: 'caption_1',
              type: 'CAPTION',
              content: 'Sunset walk',
              style: 'warm',
              reason: null,
              isSelected: true,
            },
            {
              id: 'layout_1',
              type: 'LAYOUT',
              content: 'grid',
              style: null,
              reason: 'Best for multiple focal points',
              isSelected: true,
            },
          ],
          pipelineRuns: [
            {
              id: 'run_2',
              status: 'DEGRADED',
              triggerType: 'CAPTION_REGEN',
              attemptNumber: 2,
              summary: 'caption fallback applied',
              startedAt: '2026-05-16T10:00:00.000Z',
              completedAt: '2026-05-16T10:00:18.000Z',
              duration: 18432,
              totalTokens: 321,
              totalCost: 0.03,
              errorCode: null,
            },
          ],
        }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1'),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'photo_1',
    status: 'READY',
    fileName: 'IMG_0001.JPG',
    aiCaption: 'Sunset walk',
    aiLayout: 'grid',
    latestRun: {
      id: 'run_2',
      status: 'DEGRADED',
      triggerType: 'CAPTION_REGEN',
      attemptNumber: 2,
      summary: 'caption fallback applied',
      startedAt: '2026-05-16T10:00:00.000Z',
      completedAt: '2026-05-16T10:00:18.000Z',
      duration: 18432,
      totalTokens: 321,
      totalCost: 0.03,
      errorCode: null,
    },
    captionVariants: [
      {
        id: 'caption_1',
        type: 'CAPTION',
        content: 'Sunset walk',
        style: 'warm',
        reason: null,
        isSelected: true,
      },
    ],
    layoutVariants: [
      {
        id: 'layout_1',
        type: 'LAYOUT',
        content: 'grid',
        style: null,
        reason: 'Best for multiple focal points',
        isSelected: true,
      },
    ],
  })
})

test('createGetPhotoHandler tolerates missing aiVariants array in returned photo object', async () => {
  const handler = createGetPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          status: 'READY',
          fileName: 'IMG_0001.JPG',
          aiCaption: 'Sunset walk',
          aiLayout: 'grid',
          pipelineRuns: [],
        }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1'),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'photo_1',
    status: 'READY',
    fileName: 'IMG_0001.JPG',
    aiCaption: 'Sunset walk',
    aiLayout: 'grid',
    latestRun: null,
    captionVariants: [],
    layoutVariants: [],
  })
})

test('createPatchPhotoHandler selects an AI caption variant and clears sibling selections', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []

  const handler = createPatchPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          albumId: 'album_1',
        }),
        update: async (args: { where: unknown; data: unknown }) => {
          updateCalls.push(args)
          return {
            id: 'photo_1',
            aiCaption: 'A gentler rewrite',
            selectedCaptionSource: 'AI',
          }
        },
      },
      photoAIVariant: {
        findFirst: async () => ({
          id: 'caption_2',
          photoId: 'photo_1',
          type: 'CAPTION',
          content: 'A gentler rewrite',
          style: 'gentle',
          reason: null,
          isSelected: false,
        }),
        updateMany: async () => ({ count: 2 }),
        update: async () => ({
          id: 'caption_2',
          isSelected: true,
        }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) => callback({
        photo: {
          update: async (args: { where: unknown; data: unknown }) => {
            updateCalls.push(args)
            return {
              id: 'photo_1',
              aiCaption: 'A gentler rewrite',
              selectedCaptionSource: 'AI',
            }
          },
        },
        photoAIVariant: {
          findFirst: async () => ({
            id: 'caption_2',
            photoId: 'photo_1',
            type: 'CAPTION',
            content: 'A gentler rewrite',
            style: 'gentle',
            reason: null,
            isSelected: false,
          }),
          updateMany: async () => ({ count: 2 }),
          update: async () => ({
            id: 'caption_2',
            isSelected: true,
          }),
        },
      } as never),
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1', {
      method: 'PATCH',
      body: { selectedCaptionVariantId: 'caption_2' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'photo_1',
    aiCaption: 'A gentler rewrite',
    selectedCaptionSource: 'AI',
  })
  assert.deepEqual(updateCalls, [
    {
      where: { id: 'photo_1' },
      data: {
        aiCaption: 'A gentler rewrite',
        selectedCaptionSource: 'AI',
      },
    },
  ])
})

test('createDeletePhotoHandler removes dependent records before deleting the photo', async () => {
  const calls: string[] = []
  const handler = createDeletePhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          albumId: 'album_1',
        }),
      },
      $transaction: async <T>(callback: (tx: never) => Promise<T>) =>
        callback({
          photoAIVariant: {
            deleteMany: async () => {
              calls.push('photoAIVariant.deleteMany')
              return { count: 1 }
            },
            findFirst: async () => null,
            updateMany: async () => ({ count: 0 }),
            update: async () => ({}),
          },
          pipelineRun: {
            deleteMany: async () => {
              calls.push('pipelineRun.deleteMany')
              return { count: 1 }
            },
          },
          photo: {
            delete: async () => {
              calls.push('photo.delete')
              return {}
            },
            findMany: async () => {
              calls.push('photo.findMany')
              return []
            },
            update: async () => {
              calls.push('photo.update')
              return {}
            },
          },
          album: {
            findUnique: async () => ({
              id: 'album_1',
              coverMode: 'AUTO',
              coverPhotoId: null,
              photos: [],
            }),
            update: async () => {
              calls.push('album.update')
              return {}
            },
          },
        } as never),
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1', { method: 'DELETE' }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 204)
  assert.deepEqual(calls.slice(0, 3), [
    'photoAIVariant.deleteMany',
    'pipelineRun.deleteMany',
    'photo.delete',
  ])
})

test('createPatchPhotoHandler marks manual edits with MANUAL sources', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []

  const handler = createPatchPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          albumId: 'album_1',
        }),
        update: async (args: { where: unknown; data: unknown }) => {
          updateCalls.push(args)
          return {
            id: 'photo_1',
            userCaption: 'We stayed until dusk',
            aiLayout: 'editorial-stack',
            selectedCaptionSource: 'MANUAL',
            selectedLayoutSource: 'MANUAL',
          }
        },
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1', {
      method: 'PATCH',
      body: {
        userCaption: 'We stayed until dusk',
        aiLayout: 'editorial-stack',
      },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(updateCalls, [
    {
      where: { id: 'photo_1' },
      data: {
        userCaption: 'We stayed until dusk',
        selectedCaptionSource: 'MANUAL',
        aiLayout: 'editorial-stack',
        selectedLayoutSource: 'MANUAL',
      },
    },
  ])
})

test('createPatchPhotoHandler stores optional moment context for a single photo', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []

  const handler = createPatchPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          albumId: 'album_1',
        }),
        update: async (args: { where: unknown; data: unknown }) => {
          updateCalls.push(args)
          return {
            id: 'photo_1',
            momentContext: '想留住她回头笑的时候',
            momentPromptAnswer: '这是他偷拍我的',
          }
        },
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1', {
      method: 'PATCH',
      body: {
        momentContext: '想留住她回头笑的时候',
        momentPromptAnswer: '这是他偷拍我的',
      },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(updateCalls, [
    {
      where: { id: 'photo_1' },
      data: {
        momentContext: '想留住她回头笑的时候',
        momentPromptAnswer: '这是他偷拍我的',
      },
    },
  ])
})
