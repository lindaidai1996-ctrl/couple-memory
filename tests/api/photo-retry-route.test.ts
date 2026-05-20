import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRetryPhotoHandler,
} from '../../src/app/api/couples/[coupleId]/photos/[photoId]/retry/route'

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

test('createRetryPhotoHandler maps LAYOUT_ONLY scope to LAYOUT_REGEN for a ready photo', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []
  const processCalls: Array<{ triggerType?: unknown }> = []

  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'READY',
          pipelineRuns: [{ status: 'COMPLETED' }],
        }),
        updateMany: async (args: { where: unknown; data: unknown }) => {
          updateCalls.push(args)
          return { count: 1 }
        },
      },
    } as never,
    processPhotoImpl: async (_photoId, _ossKey, _clientExif, triggerType) => {
      processCalls.push({ triggerType })
      return { runId: 'run_layout', photoStatus: 'READY' as const }
    },
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/retry', {
      method: 'POST',
      body: { scope: 'LAYOUT_ONLY' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(updateCalls, [
    {
      where: { id: 'photo_1', status: 'READY' },
      data: { status: 'PROCESSING', processingError: null },
    },
  ])
  assert.deepEqual(processCalls, [{ triggerType: 'LAYOUT_REGEN' }])
})

test('createRetryPhotoHandler rejects FULL retry for a ready photo', async () => {
  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'READY',
          pipelineRuns: [{ status: 'COMPLETED' }],
        }),
        updateMany: async () => ({ count: 1 }),
      },
    } as never,
    processPhotoImpl: async () => ({ runId: 'run_full', photoStatus: 'READY' as const }),
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/retry', {
      method: 'POST',
      body: { scope: 'FULL' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    error: {
      code: 'PHOTO_RETRY_NOT_ALLOWED',
      message: 'Photo is not eligible for retry',
      retryable: false,
    },
  })
})

test('createRetryPhotoHandler accepts CAPTION_ONLY when the latest run is DEGRADED', async () => {
  const processCalls: Array<{ triggerType?: unknown }> = []

  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'READY',
          pipelineRuns: [{ status: 'DEGRADED' }],
        }),
        updateMany: async () => ({ count: 1 }),
      },
    } as never,
    processPhotoImpl: async (_photoId, _ossKey, _clientExif, triggerType) => {
      processCalls.push({ triggerType })
      return { runId: 'run_caption', photoStatus: 'READY' as const }
    },
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/retry', {
      method: 'POST',
      body: { scope: 'CAPTION_ONLY' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(processCalls, [{ triggerType: 'CAPTION_REGEN' }])
})

test('createRetryPhotoHandler rejects unsupported retry scope with all supported values in the message', async () => {
  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'FAILED',
          pipelineRuns: [],
        }),
        updateMany: async () => ({ count: 1 }),
      },
    } as never,
    processPhotoImpl: async () => {
      throw new Error('processPhoto should not be called for invalid scope')
    },
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/retry', {
      method: 'POST',
      body: { scope: 'UNKNOWN' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: {
      code: 'INVALID_RETRY_SCOPE',
      message: 'scope must be FULL, CAPTION_ONLY, or LAYOUT_ONLY',
      retryable: false,
    },
  })
})
