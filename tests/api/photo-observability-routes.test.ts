import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRetryPhotoHandler,
} from '../../src/app/api/couples/[coupleId]/photos/[photoId]/retry/route'
import {
  createGetPhotoHandler,
} from '../../src/app/api/couples/[coupleId]/photos/[photoId]/route'
import {
  createPhotoRunsHandler,
} from '../../src/app/api/couples/[coupleId]/photos/[photoId]/runs/route'
import {
  createCoupleRunsHandler,
} from '../../src/app/api/couples/[coupleId]/runs/route'
import {
  createRunDetailHandler,
} from '../../src/app/api/couples/[coupleId]/runs/[runId]/route'

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

test('createRetryPhotoHandler maps FULL scope to MANUAL_RETRY and returns the queued run id', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []
  const processCalls: Array<{ photoId: string; ossKey: string; clientExif?: unknown; triggerType?: unknown }> = []

  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'FAILED',
          pipelineRuns: [],
        }),
        updateMany: async (args: { where: unknown; data: unknown }) => {
          updateCalls.push(args)
          return { count: 1 }
        },
      },
    } as never,
    processPhotoImpl: async (photoId, ossKey, clientExif, triggerType) => {
      processCalls.push({ photoId, ossKey, clientExif, triggerType })
      return { runId: 'run_3', photoStatus: 'READY' as const }
    },
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/retry', {
      method: 'POST',
      body: { scope: 'FULL' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    photoId: 'photo_1',
    runId: 'run_3',
    status: 'PROCESSING',
  })
  assert.deepEqual(updateCalls, [
    {
      where: { id: 'photo_1', status: 'FAILED' },
      data: { status: 'PROCESSING', processingError: null },
    },
  ])
  assert.deepEqual(processCalls, [
    {
      photoId: 'photo_1',
      ossKey: 'uploads/couple_1/photo_1/original.jpg',
      clientExif: undefined,
      triggerType: 'MANUAL_RETRY',
    },
  ])
})

test('createRetryPhotoHandler maps CAPTION_ONLY scope to CAPTION_REGEN', async () => {
  const processCalls: Array<{ triggerType?: unknown }> = []

  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'FAILED',
          pipelineRuns: [{ status: 'DEGRADED' }],
        }),
        updateMany: async () => ({ count: 1 }),
      },
    } as never,
    processPhotoImpl: async (_photoId, _ossKey, _clientExif, triggerType) => {
      processCalls.push({ triggerType })
      return { runId: 'run_4', photoStatus: 'READY' as const }
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
  assert.deepEqual(await response.json(), {
    photoId: 'photo_1',
    runId: 'run_4',
    status: 'PROCESSING',
  })
  assert.deepEqual(processCalls, [{ triggerType: 'CAPTION_REGEN' }])
})

test('createRetryPhotoHandler allows CAPTION_ONLY when the latest run is DEGRADED', async () => {
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
      return { runId: 'run_5', photoStatus: 'READY' as const }
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
  assert.deepEqual(await response.json(), {
    photoId: 'photo_1',
    runId: 'run_5',
    status: 'PROCESSING',
  })
  assert.deepEqual(processCalls, [{ triggerType: 'CAPTION_REGEN' }])
})

test('createRetryPhotoHandler rejects unsupported retry scope', async () => {
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

test('createRetryPhotoHandler aborts when another request already claimed the retry', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []
  const processCalls: Array<{ photoId: string; ossKey: string; clientExif?: unknown }> = []

  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'FAILED',
          pipelineRuns: [],
        }),
        updateMany: async (args: { where: unknown; data: unknown }) => {
          updateCalls.push(args)
          return { count: 0 }
        },
      },
    } as never,
    processPhotoImpl: async (photoId, ossKey, clientExif) => {
      processCalls.push({ photoId, ossKey, clientExif })
      return { runId: null, photoStatus: 'READY' as const }
    },
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
      code: 'PIPELINE_ALREADY_RUNNING',
      message: 'Pipeline is already running for this photo',
      retryable: false,
    },
  })
  assert.deepEqual(updateCalls, [
    {
      where: { id: 'photo_1', status: 'FAILED' },
      data: { status: 'PROCESSING', processingError: null },
    },
  ])
  assert.deepEqual(processCalls, [])
})

test('createRetryPhotoHandler returns a unified not-found error', async () => {
  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => null,
      },
    } as never,
    processPhotoImpl: async () => ({ runId: null, photoStatus: 'READY' as const }),
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_missing/retry', {
      method: 'POST',
      body: { scope: 'FULL' },
    }),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_missing' }
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    error: {
      code: 'PHOTO_NOT_FOUND',
      message: 'Photo not found',
      retryable: false,
    },
  })
})

test('createRetryPhotoHandler rejects retry while a pipeline run is still active', async () => {
  const updateCalls: Array<{ where: unknown; data: unknown }> = []
  const processCalls: Array<{ photoId: string; ossKey: string; clientExif?: unknown }> = []

  const handler = createRetryPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          status: 'PROCESSING',
          pipelineRuns: [{ status: 'RUNNING' }],
        }),
      },
    } as never,
    processPhotoImpl: async (photoId, ossKey, clientExif) => {
      processCalls.push({ photoId, ossKey, clientExif })
      return { runId: null, photoStatus: 'READY' as const }
    },
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
      code: 'PIPELINE_ALREADY_RUNNING',
      message: 'Pipeline is already running for this photo',
      retryable: false,
    },
  })
  assert.deepEqual(updateCalls, [])
  assert.deepEqual(processCalls, [])
})

test('createGetPhotoHandler returns the photo and its latest run', async () => {
  const handler = createGetPhotoHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({
          id: 'photo_1',
          status: 'FAILED',
          processingError: 'captionWriter timeout',
          fileName: 'IMG_0001.JPG',
          originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
          pipelineRuns: [
            {
              id: 'run_2',
              status: 'FAILED',
              triggerType: 'RETRY',
              attemptNumber: 2,
              summary: 'captionWriter timeout',
              startedAt: '2026-05-16T10:00:00.000Z',
              completedAt: '2026-05-16T10:00:18.000Z',
              duration: 18432,
              totalTokens: 321,
              totalCost: 0.03,
              errorCode: 'CAPTION_TIMEOUT',
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
    status: 'FAILED',
    processingError: 'captionWriter timeout',
    fileName: 'IMG_0001.JPG',
    originalUrl: 'https://cdn.example.com/uploads/couple_1/photo_1/original.jpg',
    latestRun: {
      id: 'run_2',
      status: 'FAILED',
      triggerType: 'RETRY',
      attemptNumber: 2,
      summary: 'captionWriter timeout',
      startedAt: '2026-05-16T10:00:00.000Z',
      completedAt: '2026-05-16T10:00:18.000Z',
      duration: 18432,
      totalTokens: 321,
      totalCost: 0.03,
      errorCode: 'CAPTION_TIMEOUT',
    },
    captionVariants: [],
    layoutVariants: [],
  })
})

test('createPhotoRunsHandler returns run history for a photo', async () => {
  const handler = createPhotoRunsHandler({
    prismaClient: {
      photo: {
        findFirst: async () => ({ id: 'photo_1' }),
      },
      pipelineRun: {
        findMany: async () => [
          {
            id: 'run_2',
            status: 'FAILED',
            triggerType: 'RETRY',
            attemptNumber: 2,
            summary: 'captionWriter timeout',
            startedAt: '2026-05-16T10:00:00.000Z',
            duration: 18432,
          },
        ],
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/photos/photo_1/runs'),
    createAuthContext(),
    { coupleId: 'couple_1', photoId: 'photo_1' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    runs: [
      {
        id: 'run_2',
        status: 'FAILED',
        triggerType: 'RETRY',
        attemptNumber: 2,
        summary: 'captionWriter timeout',
        startedAt: '2026-05-16T10:00:00.000Z',
        duration: 18432,
      },
    ],
  })
})

test('createCoupleRunsHandler supports filters and pagination', async () => {
  const calls: Array<{ where: unknown; skip?: number; take?: number }> = []

  const handler = createCoupleRunsHandler({
    prismaClient: {
      pipelineRun: {
        findMany: async (args: { where: unknown; skip?: number; take?: number }) => {
          calls.push(args)
          return [
            {
              id: 'run_2',
              status: 'FAILED',
              triggerType: 'RETRY',
              attemptNumber: 2,
              summary: 'captionWriter timeout',
              startedAt: '2026-05-16T10:00:00.000Z',
              duration: 18432,
              photo: {
                id: 'photo_1',
                albumId: 'album_1',
                fileName: 'IMG_0001.JPG',
                thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
                album: {
                  id: 'album_1',
                  title: 'Trips',
                },
              },
            },
          ]
        },
        count: async () => 11,
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/runs?status=FAILED&photoId=photo_1&albumId=album_1&triggerType=RETRY&page=2&limit=5'),
    createAuthContext()
  )

  assert.equal(response.status, 200)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0]?.where, {
    coupleId: 'couple_1',
    status: 'FAILED',
    photoId: 'photo_1',
    triggerType: 'RETRY',
    photo: {
      albumId: 'album_1',
    },
  })
  assert.equal(calls[0]?.skip, 5)
  assert.equal(calls[0]?.take, 5)
  assert.deepEqual(await response.json(), {
    runs: [
      {
        id: 'run_2',
        status: 'FAILED',
        triggerType: 'RETRY',
        attemptNumber: 2,
        summary: 'captionWriter timeout',
        startedAt: '2026-05-16T10:00:00.000Z',
        duration: 18432,
        photo: {
          id: 'photo_1',
          albumId: 'album_1',
          fileName: 'IMG_0001.JPG',
          thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
          album: {
            id: 'album_1',
            title: 'Trips',
          },
        },
      },
    ],
    total: 11,
    page: 2,
    limit: 5,
  })
})

test('createRunDetailHandler returns detailed run data', async () => {
  const handler = createRunDetailHandler({
    prismaClient: {
      pipelineRun: {
        findFirst: async () => ({
          id: 'run_2',
          status: 'FAILED',
          triggerType: 'RETRY',
          attemptNumber: 2,
          summary: 'captionWriter timeout',
          errorCode: 'CAPTION_TIMEOUT',
          totalTokens: 321,
          totalCost: 0.03,
          duration: 18432,
          nodeResults: {
            captionWriter: {
              status: 'FAILED',
              duration: 12000,
            },
          },
          photo: {
            id: 'photo_1',
            status: 'FAILED',
            processingError: 'captionWriter timeout',
            fileName: 'IMG_0001.JPG',
            thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
            album: {
              id: 'album_1',
              title: 'Trips',
            },
          },
        }),
      },
    } as never,
  })

  const response = await handler(
    createJsonRequest('/api/couples/couple_1/runs/run_2'),
    createAuthContext(),
    { coupleId: 'couple_1', runId: 'run_2' }
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'run_2',
    status: 'FAILED',
    triggerType: 'RETRY',
    attemptNumber: 2,
    summary: 'captionWriter timeout',
    errorCode: 'CAPTION_TIMEOUT',
    totalTokens: 321,
    totalCost: 0.03,
    duration: 18432,
    nodeResults: {
      captionWriter: {
        status: 'FAILED',
        duration: 12000,
      },
    },
    photo: {
      id: 'photo_1',
      status: 'FAILED',
      processingError: 'captionWriter timeout',
      fileName: 'IMG_0001.JPG',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      album: {
        id: 'album_1',
        title: 'Trips',
      },
    },
  })
})
