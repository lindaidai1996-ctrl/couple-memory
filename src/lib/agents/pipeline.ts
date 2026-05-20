import { executePipeline } from './engine'
import type { DAGNode, PipelineInput, NodeResult } from './engine/types'

export type PipelineExecutionStatus = 'COMPLETED' | 'FAILED' | 'DEGRADED'

type PipelineExecutionResultLike = {
  status: 'COMPLETED' | 'FAILED'
  nodeResults: Record<string, NodeResult>
  totalTokens: number
  totalCost: number
  duration: number
}

function getFirstFailedNode(nodeResults: Record<string, NodeResult>) {
  return Object.values(nodeResults).find(node => node.status === 'FAILED')
}

async function loadPrisma() {
  const { prisma } = await import('@/lib/prisma')
  return prisma
}

type PipelinePrismaClient = Awaited<ReturnType<typeof loadPrisma>>

type CaptionOutput = {
  caption?: string
  keywords?: string[]
  style?: string
  variants?: Array<{ text?: string; style?: string }>
}

type LayoutOutput = {
  layout?: string
  reason?: string
  alternatives?: string[]
}

function hasNodeOutput(nodeResult: NodeResult | undefined): boolean {
  return nodeResult?.status === 'COMPLETED' && nodeResult.output !== undefined
}

async function loadDagNodes(): Promise<DAGNode[]> {
  const [
    { photoAnalyzer },
    { captionWriter },
    { layoutAdvisor },
    { timelineBuilder },
  ] = await Promise.all([
    import('./photo-analyzer'),
    import('./caption-writer'),
    import('./layout-advisor'),
    import('./timeline-builder'),
  ])

  return [
    { id: 'photoAnalyzer', agent: photoAnalyzer, dependencies: [] },
    { id: 'captionWriter', agent: captionWriter, dependencies: ['photoAnalyzer'] },
    { id: 'layoutAdvisor', agent: layoutAdvisor, dependencies: ['photoAnalyzer'] },
    { id: 'timelineBuilder', agent: timelineBuilder, dependencies: ['photoAnalyzer'] },
  ]
}

export function buildPipelineRunUpdate({
  result,
  triggerType = 'UPLOAD',
  attemptNumber = 1,
}: {
  result: PipelineExecutionResultLike
  triggerType?: string
  attemptNumber?: number
}) {
  const failedNode = getFirstFailedNode(result.nodeResults)
  const hasCompletedNode = Object.values(result.nodeResults).some(node => node.status === 'COMPLETED')
  const status: PipelineExecutionStatus =
    result.status === 'COMPLETED'
      ? 'COMPLETED'
      : failedNode && hasCompletedNode
        ? 'DEGRADED'
        : 'FAILED'

  return {
    status,
    triggerType,
    attemptNumber,
    nodeResults: JSON.parse(JSON.stringify(result.nodeResults)),
    totalTokens: result.totalTokens,
    totalCost: result.totalCost,
    completedAt: new Date(),
    duration: result.duration,
    errorCode: failedNode ? `${failedNode.nodeId.toUpperCase()}_FAILED` : null,
    summary: failedNode ? `${failedNode.nodeId} failed: ${failedNode.error ?? 'Unknown error'}` : null,
  }
}

export async function runAIPipeline(
  input: PipelineInput,
  coupleId: string,
  options?: { triggerType?: string }
) {
  const prisma = await loadPrisma()
  const dagNodes = await loadDagNodes()
  const latestRun = await prisma.pipelineRun.findFirst({
    where: { photoId: input.photoId },
    orderBy: [{ attemptNumber: 'desc' }, { startedAt: 'desc' }],
    select: { attemptNumber: true },
  })
  const attemptNumber = (latestRun?.attemptNumber ?? 0) + 1
  const triggerType = options?.triggerType ?? 'UPLOAD'

  const run = await prisma.pipelineRun.create({
    data: {
      coupleId,
      photoId: input.photoId,
      triggerType,
      attemptNumber,
      dag: dagNodes.map(n => ({ id: n.id, dependencies: n.dependencies })),
    },
  })

  const result = await executePipeline(dagNodes, input)
  const update = buildPipelineRunUpdate({
    result,
    triggerType,
    attemptNumber,
  })

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: update,
  })

  return {
    runId: run.id,
    ...result,
    status: update.status,
    errorCode: update.errorCode,
    summary: update.summary,
    triggerType,
    attemptNumber,
  }
}

export async function applyPipelineResults(
  photoId: string,
  nodeResults: Record<string, NodeResult>,
  coupleId: string
) {
  const prisma = await loadPrisma()
  return createApplyPipelineResults({ prisma })(photoId, nodeResults, coupleId)
}

function normalizeCaptionVariants(caption: CaptionOutput | undefined) {
  const selectedCaption = typeof caption?.caption === 'string' ? caption.caption : undefined
  const selectedStyle = typeof caption?.style === 'string' ? caption.style : null
  const rawVariants = Array.isArray(caption?.variants) ? caption.variants : []
  const variants = rawVariants
    .filter((item): item is { text?: string; style?: string } => !!item && typeof item === 'object')
    .map(item => ({
      text: typeof item.text === 'string' ? item.text.trim() : '',
      style: typeof item.style === 'string' ? item.style.trim() : '',
    }))
    .filter(item => item.text.length > 0)
    .map(item => ({
      text: item.text,
      style: item.style || null,
    }))
    .filter((item, idx, arr) =>
      arr.findIndex(candidate => candidate.text === item.text && candidate.style === item.style) === idx
    )

  if (!selectedCaption) {
    return variants.map(item => ({ ...item, isSelected: false }))
  }

  const selectedIndex =
    selectedStyle !== null
      ? variants.findIndex(item => item.text === selectedCaption && item.style === selectedStyle)
      : variants.findIndex(item => item.text === selectedCaption)

  if (selectedIndex >= 0) {
    return variants.map((item, idx) => ({
      ...item,
      style: idx === selectedIndex && !item.style ? selectedStyle : item.style,
      isSelected: idx === selectedIndex,
    }))
  }

  return [
    {
      text: selectedCaption,
      style: selectedStyle,
      isSelected: true,
    },
    ...variants.map(item => ({ ...item, isSelected: false })),
  ]
}

function normalizeLayoutVariants(layout: LayoutOutput | undefined) {
  const selectedLayout = typeof layout?.layout === 'string' && layout.layout.trim().length > 0
    ? layout.layout.trim()
    : 'side-by-side'
  const selectedReason = typeof layout?.reason === 'string' && layout.reason.trim().length > 0
    ? layout.reason.trim()
    : null
  const alternatives = Array.isArray(layout?.alternatives)
    ? layout.alternatives
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0 && item !== selectedLayout)
      .filter((item, idx, arr) => arr.indexOf(item) === idx)
    : []

  return [
    {
      content: selectedLayout,
      reason: selectedReason,
      isSelected: true,
    },
    ...alternatives.map(item => ({
      content: item,
      reason: 'Alternative layout suggested by AI.',
      isSelected: false,
    })),
  ]
}

export function createApplyPipelineResults({ prisma }: { prisma: PipelinePrismaClient }) {
  return async function applyPipelineResultsWithDeps(
    photoId: string,
    nodeResults: Record<string, NodeResult>,
    coupleId: string
  ) {
    const hasCaptionOutput = hasNodeOutput(nodeResults.captionWriter)
    const hasLayoutOutput = hasNodeOutput(nodeResults.layoutAdvisor)
    const hasAnalysisOutput = hasNodeOutput(nodeResults.photoAnalyzer)
    const caption = hasCaptionOutput ? nodeResults.captionWriter?.output as CaptionOutput | undefined : undefined
    const layout = hasLayoutOutput ? nodeResults.layoutAdvisor?.output as LayoutOutput | undefined : undefined
    const analysis = hasAnalysisOutput ? nodeResults.photoAnalyzer?.output as {
      scene?: string; mood?: string; composition?: string; colorTone?: string
    } | undefined : undefined
    const timeline = nodeResults.timelineBuilder?.output as {
      shouldCreateMilestone?: boolean
      milestone?: { title: string; description: string; date: string; locationName: string }
    } | undefined

    const photoData: Record<string, unknown> = {}

    if (hasAnalysisOutput) {
      if (typeof analysis?.scene === 'string') {
        photoData.aiScene = analysis.scene
      }
      if (typeof analysis?.mood === 'string') {
        photoData.aiMood = analysis.mood
      }
      if (typeof analysis?.composition === 'string') {
        photoData.aiComposition = analysis.composition
      }
      if (typeof analysis?.colorTone === 'string') {
        photoData.aiColorTone = analysis.colorTone
      }
    }

    if (hasCaptionOutput) {
      // Phase 3: aiCaption stays available for ungrouped-photo assist,
      // but chapter-level collaboration is now the primary frontstage flow.
      photoData.aiCaption = caption?.caption
      photoData.aiKeywords = caption?.keywords || []
      photoData.selectedCaptionSource = 'AI'
    }

    if (hasLayoutOutput) {
      photoData.aiLayout = layout?.layout || 'side-by-side'
      photoData.selectedLayoutSource = 'AI'
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: photoData,
    })

    const variantTypes: Array<'CAPTION' | 'LAYOUT'> = []
    if (hasCaptionOutput) {
      variantTypes.push('CAPTION')
    }
    if (hasLayoutOutput) {
      variantTypes.push('LAYOUT')
    }

    if (variantTypes.length > 0) {
      await prisma.photoAIVariant.deleteMany({
        where: {
          photoId,
          type: { in: variantTypes },
        },
      })
    }

    const variants = [
      ...(hasCaptionOutput ? normalizeCaptionVariants(caption).map(item => ({
        photoId,
        type: 'CAPTION',
        content: item.text,
        style: item.style,
        reason: null,
        isSelected: item.isSelected,
      })) : []),
      ...(hasLayoutOutput ? normalizeLayoutVariants(layout).map(item => ({
        photoId,
        type: 'LAYOUT',
        content: item.content,
        style: null,
        reason: item.reason,
        isSelected: item.isSelected,
      })) : []),
    ]

    if (variants.length > 0) {
      await prisma.photoAIVariant.createMany({
        data: variants,
      })
    }

    if (timeline?.shouldCreateMilestone && timeline.milestone) {
      await prisma.milestone.create({
        data: {
          coupleId,
          title: timeline.milestone.title,
          description: timeline.milestone.description,
          date: new Date(timeline.milestone.date),
          locationName: timeline.milestone.locationName,
          photoId,
          isAutoGenerated: true,
        },
      })
    }
  }
}
