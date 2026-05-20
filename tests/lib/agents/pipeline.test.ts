import assert from 'node:assert/strict'
import test from 'node:test'

import { createApplyPipelineResults } from '../../../src/lib/agents/pipeline'
import type { NodeResult } from '../../../src/lib/agents/engine/types'

function completedNodeResult(nodeId: string, output: unknown): NodeResult {
  return {
    nodeId,
    status: 'COMPLETED',
    output,
    duration: 10,
    tokens: 20,
    cost: 0.01,
    retryCount: 0,
  }
}

test('applyPipelineResults persists selected AI fields and rebuilds caption and layout variants', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  const deletedVariants: Array<{ where: unknown }> = []
  const createdVariants: Array<Record<string, unknown>> = []

  const applyPipelineResults = createApplyPipelineResults({
    prisma: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_1' }
        },
      },
      photoAIVariant: {
        deleteMany: async (args: { where: unknown }) => {
          deletedVariants.push(args)
          return { count: 2 }
        },
        createMany: async (args: { data: Array<Record<string, unknown>> }) => {
          createdVariants.push(...args.data)
          return { count: args.data.length }
        },
      },
      milestone: {
        create: async () => ({ id: 'milestone_1' }),
      },
    } as never,
  })

  await applyPipelineResults(
    'photo_1',
    {
      captionWriter: completedNodeResult('captionWriter', {
        caption: '海风把傍晚吹得很轻，我们站在光里记住这次散步。',
        keywords: ['海边', '夕阳', '散步'],
        variants: [
          { text: '海风把傍晚吹得很轻，我们站在光里记住这次散步。', style: 'poetic' },
          { text: '今天的海边很安静，连并肩走路都像被认真收藏。', style: 'diary' },
        ],
      }),
      layoutAdvisor: completedNodeResult('layoutAdvisor', {
        layout: 'story-card',
        reason: '画面情绪稳定，适合卡片式叙事。',
        alternatives: ['side-by-side', 'cinema-wide'],
      }),
      photoAnalyzer: completedNodeResult('photoAnalyzer', {
        scene: 'beach',
        mood: 'calm',
        composition: 'wide',
        colorTone: 'golden',
      }),
    },
    'couple_1',
  )

  assert.equal(photoUpdates.length, 1)
  assert.deepEqual(photoUpdates[0], {
    where: { id: 'photo_1' },
    data: {
      aiCaption: '海风把傍晚吹得很轻，我们站在光里记住这次散步。',
      aiKeywords: ['海边', '夕阳', '散步'],
      aiLayout: 'story-card',
      aiScene: 'beach',
      aiMood: 'calm',
      aiComposition: 'wide',
      aiColorTone: 'golden',
      selectedCaptionSource: 'AI',
      selectedLayoutSource: 'AI',
    },
  })

  assert.deepEqual(deletedVariants, [
    {
      where: {
        photoId: 'photo_1',
        type: { in: ['CAPTION', 'LAYOUT'] },
      },
    },
  ])

  assert.deepEqual(createdVariants, [
    {
      photoId: 'photo_1',
      type: 'CAPTION',
      content: '海风把傍晚吹得很轻，我们站在光里记住这次散步。',
      style: 'poetic',
      reason: null,
      isSelected: true,
    },
    {
      photoId: 'photo_1',
      type: 'CAPTION',
      content: '今天的海边很安静，连并肩走路都像被认真收藏。',
      style: 'diary',
      reason: null,
      isSelected: false,
    },
    {
      photoId: 'photo_1',
      type: 'LAYOUT',
      content: 'story-card',
      style: null,
      reason: '画面情绪稳定，适合卡片式叙事。',
      isSelected: true,
    },
    {
      photoId: 'photo_1',
      type: 'LAYOUT',
      content: 'side-by-side',
      style: null,
      reason: 'Alternative layout suggested by AI.',
      isSelected: false,
    },
    {
      photoId: 'photo_1',
      type: 'LAYOUT',
      content: 'cinema-wide',
      style: null,
      reason: 'Alternative layout suggested by AI.',
      isSelected: false,
    },
  ])
})

test('applyPipelineResults keeps backward compatibility when variants or alternatives are missing', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  const createdVariants: Array<Record<string, unknown>> = []

  const applyPipelineResults = createApplyPipelineResults({
    prisma: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_2' }
        },
      },
      photoAIVariant: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async (args: { data: Array<Record<string, unknown>> }) => {
          createdVariants.push(...args.data)
          return { count: args.data.length }
        },
      },
      milestone: {
        create: async () => ({ id: 'milestone_2' }),
      },
    } as never,
  })

  await applyPipelineResults(
    'photo_2',
    {
      captionWriter: completedNodeResult('captionWriter', {
        caption: '只保留一条主文案也应该继续工作。',
        keywords: ['兼容'],
      }),
      layoutAdvisor: completedNodeResult('layoutAdvisor', {
        layout: 'portrait-hero',
        reason: '竖构图突出人物。',
      }),
    },
    'couple_2',
  )

  assert.equal(photoUpdates.length, 1)
  assert.deepEqual(photoUpdates[0]?.data, {
    aiCaption: '只保留一条主文案也应该继续工作。',
    aiKeywords: ['兼容'],
    aiLayout: 'portrait-hero',
    selectedCaptionSource: 'AI',
    selectedLayoutSource: 'AI',
  })

  assert.deepEqual(createdVariants, [
    {
      photoId: 'photo_2',
      type: 'CAPTION',
      content: '只保留一条主文案也应该继续工作。',
      style: null,
      reason: null,
      isSelected: true,
    },
    {
      photoId: 'photo_2',
      type: 'LAYOUT',
      content: 'portrait-hero',
      style: null,
      reason: '竖构图突出人物。',
      isSelected: true,
    },
  ])
})

test('applyPipelineResults preserves caption variants that share text but differ by style', async () => {
  const createdVariants: Array<Record<string, unknown>> = []

  const applyPipelineResults = createApplyPipelineResults({
    prisma: {
      photo: {
        update: async () => ({ id: 'photo_3' }),
      },
      photoAIVariant: {
        deleteMany: async () => ({ count: 0 }),
        createMany: async (args: { data: Array<Record<string, unknown>> }) => {
          createdVariants.push(...args.data)
          return { count: args.data.length }
        },
      },
      milestone: {
        create: async () => ({ id: 'milestone_3' }),
      },
    } as never,
  })

  await applyPipelineResults(
    'photo_3',
    {
      captionWriter: completedNodeResult('captionWriter', {
        caption: '同一句文案，保留不同风格。',
        style: 'poetic',
        variants: [
          { text: '同一句文案，保留不同风格。', style: 'poetic' },
          { text: '同一句文案，保留不同风格。', style: 'diary' },
          { text: '另一句文案。', style: 'narrative' },
        ],
      }),
    },
    'couple_3',
  )

  assert.deepEqual(createdVariants, [
    {
      photoId: 'photo_3',
      type: 'CAPTION',
      content: '同一句文案，保留不同风格。',
      style: 'poetic',
      reason: null,
      isSelected: true,
    },
    {
      photoId: 'photo_3',
      type: 'CAPTION',
      content: '同一句文案，保留不同风格。',
      style: 'diary',
      reason: null,
      isSelected: false,
    },
    {
      photoId: 'photo_3',
      type: 'CAPTION',
      content: '另一句文案。',
      style: 'narrative',
      reason: null,
      isSelected: false,
    },
  ])
})

test('applyPipelineResults only updates caption fields and variants when degraded run is missing layout output', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  const deletedVariants: Array<{ where: unknown }> = []
  const createdVariants: Array<Record<string, unknown>> = []

  const applyPipelineResults = createApplyPipelineResults({
    prisma: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_4' }
        },
      },
      photoAIVariant: {
        deleteMany: async (args: { where: unknown }) => {
          deletedVariants.push(args)
          return { count: 1 }
        },
        createMany: async (args: { data: Array<Record<string, unknown>> }) => {
          createdVariants.push(...args.data)
          return { count: args.data.length }
        },
      },
      milestone: {
        create: async () => ({ id: 'milestone_4' }),
      },
    } as never,
  })

  await applyPipelineResults(
    'photo_4',
    {
      captionWriter: completedNodeResult('captionWriter', {
        caption: '降级运行只更新文案。',
        keywords: ['降级', '文案'],
        variants: [{ text: '降级运行只更新文案。', style: 'diary' }],
      }),
      photoAnalyzer: completedNodeResult('photoAnalyzer', {
        scene: 'city',
      }),
    },
    'couple_4',
  )

  assert.deepEqual(photoUpdates[0], {
    where: { id: 'photo_4' },
    data: {
      aiCaption: '降级运行只更新文案。',
      aiKeywords: ['降级', '文案'],
      aiScene: 'city',
      selectedCaptionSource: 'AI',
    },
  })

  assert.deepEqual(deletedVariants, [
    {
      where: {
        photoId: 'photo_4',
        type: { in: ['CAPTION'] },
      },
    },
  ])

  assert.deepEqual(createdVariants, [
    {
      photoId: 'photo_4',
      type: 'CAPTION',
      content: '降级运行只更新文案。',
      style: 'diary',
      reason: null,
      isSelected: true,
    },
  ])
})

test('applyPipelineResults only updates layout fields and variants when degraded run is missing caption output', async () => {
  const photoUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  const deletedVariants: Array<{ where: unknown }> = []
  const createdVariants: Array<Record<string, unknown>> = []

  const applyPipelineResults = createApplyPipelineResults({
    prisma: {
      photo: {
        update: async (args: { where: unknown; data: Record<string, unknown> }) => {
          photoUpdates.push(args)
          return { id: 'photo_5' }
        },
      },
      photoAIVariant: {
        deleteMany: async (args: { where: unknown }) => {
          deletedVariants.push(args)
          return { count: 1 }
        },
        createMany: async (args: { data: Array<Record<string, unknown>> }) => {
          createdVariants.push(...args.data)
          return { count: args.data.length }
        },
      },
      milestone: {
        create: async () => ({ id: 'milestone_5' }),
      },
    } as never,
  })

  await applyPipelineResults(
    'photo_5',
    {
      layoutAdvisor: completedNodeResult('layoutAdvisor', {
        layout: 'portrait-hero',
        reason: '降级运行只更新布局。',
        alternatives: ['story-card'],
      }),
    },
    'couple_5',
  )

  assert.deepEqual(photoUpdates[0], {
    where: { id: 'photo_5' },
    data: {
      aiLayout: 'portrait-hero',
      selectedLayoutSource: 'AI',
    },
  })

  assert.deepEqual(deletedVariants, [
    {
      where: {
        photoId: 'photo_5',
        type: { in: ['LAYOUT'] },
      },
    },
  ])

  assert.deepEqual(createdVariants, [
    {
      photoId: 'photo_5',
      type: 'LAYOUT',
      content: 'portrait-hero',
      style: null,
      reason: '降级运行只更新布局。',
      isSelected: true,
    },
    {
      photoId: 'photo_5',
      type: 'LAYOUT',
      content: 'story-card',
      style: null,
      reason: 'Alternative layout suggested by AI.',
      isSelected: false,
    },
  ])
})
