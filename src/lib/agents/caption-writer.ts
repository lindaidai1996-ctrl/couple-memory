import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek, callDeepSeekVision } from './deepseek-client'
import { logger } from '@/lib/logger'
import { callOpenAIVision } from './openai-client'
import { callQwenVision } from './qwen-client'

type CaptionResult = {
  caption: string
  keywords: string[]
  style: string
  variants: Array<{ text: string; style: string }>
}
const TAG = 'agents/caption-writer'

type AnalysisLike = {
  confidence?: number
  source?: string
}

function buildCaptionPreferencePrompt(preferences: PipelineInput['preferences']) {
  const lines: string[] = []

  if (preferences?.captionStylePreference) {
    lines.push(`优先风格：${preferences.captionStylePreference}`)
  }
  if (preferences?.tonePreference) {
    lines.push(`语气倾向：${preferences.tonePreference}`)
  }
  if (preferences?.blockedPhrases && preferences.blockedPhrases.length > 0) {
    lines.push(`禁用表达：${preferences.blockedPhrases.join('、')}`)
  }
  if (preferences?.longTermMemory && preferences.longTermMemory.length > 0) {
    lines.push(...preferences.longTermMemory)
  }

  return lines
}

export function buildCaptionGenerationPrompts(
  input: PipelineInput,
  analysis: unknown
) {
  const preferenceLines = buildCaptionPreferencePrompt(input.preferences)
  const preferenceText = preferenceLines.length > 0
    ? `\n额外偏好：\n${preferenceLines.map(line => `- ${line}`).join('\n')}`
    : ''

  return {
    systemPrompt: `你是一位擅长情感表达的文案撰写者。请基于图片可见事实和补充信息生成文案。
要求：
1) 不要臆测图片中不存在的细节；
2) 文案 50-120 字；
3) 关键词 3-5 个，具体、可检索；
4) 提供 2-3 个文案变体，每个变体包含 text 和 style；
5) 只输出 JSON：{"caption":"...","keywords":["..."],"style":"romantic|poetic|diary|photography-note","variants":[{"text":"...","style":"..."}]}${preferenceText}`,
    userPrompt: `补充信息：${JSON.stringify({
      analysis,
      locationName: input.locationName || null,
      takenAt: input.exif?.takenAt || null,
      preferences: input.preferences ?? null,
    })}`,
  }
}

function parseJSON(text: string): unknown {
  const cleaned = text.replace(/```json\s*|```/g, '').trim()
  return JSON.parse(cleaned)
}

function normalizeCaptionResult(raw: unknown, confidence: number): CaptionResult {
  const input = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const caption = typeof input.caption === 'string' ? input.caption.trim() : ''
  const style = typeof input.style === 'string' ? input.style.trim() : 'diary'
  const rawKeywords = Array.isArray(input.keywords) ? input.keywords : []
  const rawVariants = Array.isArray(input.variants) ? input.variants : []

  const banned = new Set(['照片', '情侣', '回忆', '美好时光', '幸福', '温馨', '浪漫'])
  const keywords = rawKeywords
    .filter((k): k is string => typeof k === 'string')
    .map(k => k.trim())
    .filter(k => k.length >= 2 && k.length <= 10 && !banned.has(k))
    .filter((k, idx, arr) => arr.indexOf(k) === idx)
    .slice(0, 5)

  const normalizedCaption = caption || '这张照片记录了一个值得珍藏的时刻。'
  const variants = rawVariants
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      text: typeof item.text === 'string' ? item.text.trim() : '',
      style: typeof item.style === 'string' ? item.style.trim() : '',
    }))
    .filter(item => item.text.length > 0)
    .map(item => ({
      text: item.text,
      style: item.style || style,
    }))
    .filter((item, idx, arr) =>
      arr.findIndex(candidate => candidate.text === item.text && candidate.style === item.style) === idx,
    )

  const defaultVariant = { text: normalizedCaption, style }
  const normalizedVariants = [
    defaultVariant,
    ...variants.filter(item => !(item.text === defaultVariant.text && item.style === defaultVariant.style)),
  ].slice(0, 3)

  return {
    caption: normalizedCaption,
    keywords: confidence >= 0.65 ? keywords : [],
    style,
    variants: normalizedVariants,
  }
}

export function buildConservativeCaptionResult(input: PipelineInput): CaptionResult {
  const primary = input.locationName
    ? `和你一起留在${input.locationName}的这一刻，很值得被认真收藏。即使不急着替眼前的风景下定义，只要想到照片里的人是你，这份心动就已经足够具体。`
    : '和你一起被定格下来的这一刻，本身就已经很珍贵。不急着替风景下定义，光是看见照片里的人是你，心里就会慢慢变得柔软。'

  return {
    caption: primary,
    keywords: [],
    style: 'diary',
    variants: [
      { text: primary, style: 'diary' },
      {
        text: '这张照片最动人的地方，不一定是场景有多特别，而是我又一次认真记住了和你同框的样子。',
        style: 'poetic',
      },
    ],
  }
}

async function writeWithClaude(
  input: PipelineInput,
  analysis: unknown
): Promise<{ text: string; tokens: number; cost: number }> {
  const prompts = buildCaptionGenerationPrompts(input, analysis)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: input.photoUrl } },
          {
            type: 'text',
            text: `${prompts.systemPrompt}\n${prompts.userPrompt}`,
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Claude caption request failed: ${response.status} ${detail.slice(0, 200)}`.trim())
  }

  const data = await response.json() as {
    content: { text: string }[]
    usage?: { input_tokens: number; output_tokens: number }
  }
  const text = data.content?.[0]?.text || '{}'
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
  return { text, tokens, cost: tokens * 0.000015 }
}

async function writeWithDeepSeekFallback(
  input: PipelineInput,
  analysis: unknown,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; tokens: number; cost: number }> {
  try {
    logger.info(TAG, '尝试 DeepSeek 视觉生成文案', { photoId: input.photoId })
    return await callDeepSeekVision(systemPrompt, userPrompt, input.photoUrl, {
      temperature: 0.3,
      maxTokens: 400,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    logger.warn(TAG, '视觉文案失败，降级文本文案', { photoId: input.photoId, error: message })
    return callDeepSeek(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 400 })
  }
}

async function writeWithOpenAI(
  input: PipelineInput,
  analysis: unknown,
): Promise<{ text: string; tokens: number; cost: number }> {
  const { systemPrompt, userPrompt } = buildCaptionGenerationPrompts(input, analysis)

  return callOpenAIVision(systemPrompt, userPrompt, input.photoUrl, {
    temperature: 0.3,
    maxTokens: 400,
  })
}

async function writeWithQwen(
  input: PipelineInput,
  analysis: unknown,
): Promise<{ text: string; tokens: number; cost: number }> {
  const { systemPrompt, userPrompt } = buildCaptionGenerationPrompts(input, analysis)

  return callQwenVision(systemPrompt, userPrompt, input.photoUrl, {
    temperature: 0.3,
    maxTokens: 400,
  })
}

export const captionWriter: Agent = {
  id: 'captionWriter',
  async execute(input: PipelineInput, depOutputs: Record<string, unknown>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer
    const confidence = (
      analysis &&
      typeof analysis === 'object' &&
      typeof (analysis as Record<string, unknown>).confidence === 'number'
    ) ? (analysis as { confidence: number }).confidence : 0.5

    const typedAnalysis = (analysis && typeof analysis === 'object')
      ? analysis as AnalysisLike
      : null

    if (confidence < 0.35 || typedAnalysis?.source === 'metadata-only') {
      const conservative = buildConservativeCaptionResult(input)
      logger.info(TAG, '低置信度分析，使用保守本地文案', {
        photoId: input.photoId,
        confidence,
        source: typedAnalysis?.source ?? 'unknown',
      })
      return { data: conservative, tokens: 0, cost: 0 }
    }

    const { systemPrompt, userPrompt } = buildCaptionGenerationPrompts(input, analysis)

    const modelResult = process.env.QWEN_API_KEY
      ? await (async () => {
          try {
            logger.info(TAG, '使用 Qwen 视觉生成文案', { photoId: input.photoId, confidence })
            return await writeWithQwen(input, analysis)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown'
            logger.warn(TAG, 'Qwen 文案失败，降级到 OpenAI/Claude/DeepSeek', {
              photoId: input.photoId,
              error: message,
            })
            if (process.env.OPENAI_API_KEY) {
              try {
                logger.info(TAG, 'Qwen 失败后使用 OpenAI 视觉生成文案', { photoId: input.photoId, confidence })
                return await writeWithOpenAI(input, analysis)
              } catch (openAiErr) {
                const openAiMessage = openAiErr instanceof Error ? openAiErr.message : 'unknown'
                logger.warn(TAG, 'OpenAI 文案失败，继续降级到 Claude/DeepSeek', {
                  photoId: input.photoId,
                  error: openAiMessage,
                })
              }
            }
            if (process.env.CLAUDE_API_KEY) {
              try {
                logger.info(TAG, 'Qwen 失败后使用 Claude 生成文案', { photoId: input.photoId, confidence })
                return await writeWithClaude(input, analysis)
              } catch (claudeErr) {
                const claudeMessage = claudeErr instanceof Error ? claudeErr.message : 'unknown'
                logger.warn(TAG, 'Claude 文案失败，降级到 DeepSeek', {
                  photoId: input.photoId,
                  error: claudeMessage,
                })
              }
            }
            return writeWithDeepSeekFallback(input, analysis, systemPrompt, userPrompt)
          }
        })()
      : process.env.OPENAI_API_KEY
      ? await (async () => {
          try {
            logger.info(TAG, '使用 OpenAI 视觉生成文案', { photoId: input.photoId, confidence })
            return await writeWithOpenAI(input, analysis)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown'
            logger.warn(TAG, 'OpenAI 文案失败，降级到 Claude/DeepSeek', {
              photoId: input.photoId,
              error: message,
            })
            if (process.env.CLAUDE_API_KEY) {
              try {
                logger.info(TAG, 'OpenAI 失败后使用 Claude 生成文案', { photoId: input.photoId, confidence })
                return await writeWithClaude(input, analysis)
              } catch (claudeErr) {
                const claudeMessage = claudeErr instanceof Error ? claudeErr.message : 'unknown'
                logger.warn(TAG, 'Claude 文案失败，降级到 DeepSeek', {
                  photoId: input.photoId,
                  error: claudeMessage,
                })
              }
            }
            return writeWithDeepSeekFallback(input, analysis, systemPrompt, userPrompt)
          }
        })()
      : process.env.CLAUDE_API_KEY
      ? await (async () => {
          try {
            logger.info(TAG, '使用 Claude 生成文案', { photoId: input.photoId, confidence })
            return await writeWithClaude(input, analysis)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown'
            logger.warn(TAG, 'Claude 文案失败，降级到 DeepSeek', {
              photoId: input.photoId,
              error: message,
            })
            return writeWithDeepSeekFallback(input, analysis, systemPrompt, userPrompt)
          }
        })()
      : await writeWithDeepSeekFallback(input, analysis, systemPrompt, userPrompt)

    const parsed = parseJSON(modelResult.text)
    const normalized = normalizeCaptionResult(parsed, confidence)
    logger.info(TAG, '文案生成完成', {
      photoId: input.photoId,
      keywordsCount: normalized.keywords.length,
      confidence,
      tokens: modelResult.tokens,
    })
    return { data: normalized, tokens: modelResult.tokens, cost: modelResult.cost }
  },
}
