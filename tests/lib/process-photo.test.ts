import assert from 'node:assert/strict'
import test from 'node:test'

import { createProcessPhoto } from '../../src/lib/pipeline/process-photo'

test('createProcessPhoto keeps the photo failed when the AI pipeline fails', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  const appliedResults: Array<{ photoId: string; coupleId: string }> = []

  const processPhoto = createProcessPhoto({
    cdnDomain: 'cdn.example.com',
    loggerClient: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    prismaClient: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_1', ...args.data }
        },
        findUnique: async () => ({
          id: 'photo_1',
          album: { coupleId: 'couple_1' },
        }),
      },
    } as never,
    downloadFromOSSImpl: async () => Buffer.from('image'),
    generateSizesImpl: async () => ({
      thumbnailPath: 'uploads/couple_1/photo_1/thumbnail.jpg',
      displayPath: 'uploads/couple_1/photo_1/display.jpg',
      width: 1200,
      height: 800,
    }),
    extractExifImpl: async () => null,
    reverseGeocodeImpl: async () => null,
    runAIPipelineImpl: async () => ({
      status: 'FAILED',
      nodeResults: {
        photoAnalyzer: {
          nodeId: 'photoAnalyzer',
          status: 'FAILED',
          error: 'vision timeout',
          duration: 20,
          tokens: 0,
          cost: 0,
          retryCount: 2,
        },
      },
      totalTokens: 0,
      totalCost: 0,
      duration: 20,
      errorCode: 'PHOTOANALYZER_FAILED',
      summary: 'photoAnalyzer failed: vision timeout',
    }),
    applyPipelineResultsImpl: async (photoId, _nodeResults, coupleId) => {
      appliedResults.push({ photoId, coupleId })
    },
  })

  await processPhoto('photo_1', 'uploads/couple_1/photo_1/original.jpg')

  assert.equal(photoUpdates.length, 2)
  assert.equal(photoUpdates[1]?.data.status, 'FAILED')
  assert.equal(photoUpdates[1]?.data.processingError, 'photoAnalyzer failed: vision timeout')
  assert.deepEqual(appliedResults, [])
})

test('createProcessPhoto keeps degraded runs usable and applies partial AI results', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  const appliedResults: Array<{ photoId: string; coupleId: string }> = []

  const processPhoto = createProcessPhoto({
    cdnDomain: 'cdn.example.com',
    loggerClient: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    prismaClient: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_1', ...args.data }
        },
        findUnique: async () => ({
          id: 'photo_1',
          album: { coupleId: 'couple_1' },
        }),
      },
    } as never,
    downloadFromOSSImpl: async () => Buffer.from('image'),
    generateSizesImpl: async () => ({
      thumbnailPath: 'uploads/couple_1/photo_1/thumbnail.jpg',
      displayPath: 'uploads/couple_1/photo_1/display.jpg',
      width: 1200,
      height: 800,
    }),
    extractExifImpl: async () => null,
    reverseGeocodeImpl: async () => null,
    runAIPipelineImpl: async () => ({
      status: 'DEGRADED',
      nodeResults: {
        photoAnalyzer: {
          nodeId: 'photoAnalyzer',
          status: 'COMPLETED',
          output: { scene: 'beach' },
          duration: 12,
          tokens: 20,
          cost: 0.01,
          retryCount: 0,
        },
        captionWriter: {
          nodeId: 'captionWriter',
          status: 'FAILED',
          error: 'timeout',
          duration: 12,
          tokens: 0,
          cost: 0,
          retryCount: 2,
        },
      },
      totalTokens: 20,
      totalCost: 0.01,
      duration: 24,
      errorCode: 'CAPTIONWRITER_FAILED',
      summary: 'captionWriter failed: timeout',
    }),
    applyPipelineResultsImpl: async (photoId, _nodeResults, coupleId) => {
      appliedResults.push({ photoId, coupleId })
    },
  })

  await processPhoto('photo_1', 'uploads/couple_1/photo_1/original.jpg')

  assert.equal(photoUpdates.length, 2)
  assert.equal(photoUpdates[1]?.data.status, 'READY')
  assert.equal(photoUpdates[1]?.data.processingError, null)
  assert.deepEqual(appliedResults, [{ photoId: 'photo_1', coupleId: 'couple_1' }])
})

test('createProcessPhoto ignores EXIF takenAt values that are in the future', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []

  const processPhoto = createProcessPhoto({
    cdnDomain: 'cdn.example.com',
    loggerClient: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    prismaClient: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_1', ...args.data }
        },
        findUnique: async () => ({
          id: 'photo_1',
          album: { coupleId: 'couple_1' },
        }),
      },
    } as never,
    downloadFromOSSImpl: async () => Buffer.from('image'),
    generateSizesImpl: async () => ({
      thumbnailPath: 'uploads/couple_1/photo_1/thumbnail.jpg',
      displayPath: 'uploads/couple_1/photo_1/display.jpg',
      width: 1200,
      height: 800,
    }),
    extractExifImpl: async () => ({
      takenAt: new Date('2100-01-01T08:00:00.000Z'),
      latitude: null,
      longitude: null,
      cameraMake: null,
      cameraModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
    }),
    reverseGeocodeImpl: async () => null,
    runAIPipelineImpl: async () => ({
      status: 'COMPLETED',
      nodeResults: {},
      totalTokens: 0,
      totalCost: 0,
      duration: 20,
    }),
    applyPipelineResultsImpl: async () => undefined,
  })

  await processPhoto('photo_1', 'uploads/couple_1/photo_1/original.jpg')

  assert.equal(photoUpdates[0]?.data.takenAt, null)
})

test('createProcessPhoto passes couple caption preferences into the AI pipeline input', async () => {
  let receivedPreferences: {
    captionStylePreference?: string | null
    tonePreference?: string | null
    blockedPhrases?: string[]
    longTermMemory?: string[]
  } | null = null

  const processPhoto = createProcessPhoto({
    cdnDomain: 'cdn.example.com',
    loggerClient: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    prismaClient: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => ({ id: 'photo_1', ...args.data }),
        findUnique: async () => ({
          id: 'photo_1',
          album: {
            coupleId: 'couple_1',
            couple: {
              captionStylePreference: 'poetic',
              tonePreference: 'gentle',
              blockedPhrases: ['幸福', '永远'],
            },
          },
        }),
      },
    } as never,
    downloadFromOSSImpl: async () => Buffer.from('image'),
    generateSizesImpl: async () => ({
      thumbnailPath: 'uploads/couple_1/photo_1/thumbnail.jpg',
      displayPath: 'uploads/couple_1/photo_1/display.jpg',
      width: 1200,
      height: 800,
    }),
    extractExifImpl: async () => null,
    reverseGeocodeImpl: async () => null,
    resolveStyleMemoryProfileImpl: async () => ({
      preferredStyle: 'poetic',
      preferredTone: 'gentle',
      blockedPhrases: ['幸福', '永远'],
      anchorKeywords: ['晚风', '散步'],
      anchorLocations: ['广州'],
      selectedStyleCounts: [{ style: 'poetic', count: 2 }],
      userEditedCount: 1,
      keptAICount: 1,
      sourceSampleCount: 2,
      summaryLines: [],
    }),
    runAIPipelineImpl: async (input) => {
      receivedPreferences = input.preferences ?? null
      return {
        status: 'COMPLETED',
        nodeResults: {},
        totalTokens: 0,
        totalCost: 0,
        duration: 20,
      }
    },
    applyPipelineResultsImpl: async () => undefined,
  })

  await processPhoto('photo_1', 'uploads/couple_1/photo_1/original.jpg')

  assert.deepEqual(receivedPreferences, {
    captionStylePreference: 'poetic',
    tonePreference: 'gentle',
    blockedPhrases: ['幸福', '永远'],
    longTermMemory: [
      '长期风格优先参考：poetic',
      '长期语气延续：gentle',
      '长期保留的意象：晚风、散步',
      '长期重复出现的地点：广州',
      '长期避用表达：幸福、永远',
    ],
  })
})
