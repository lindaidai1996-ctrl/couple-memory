import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek, callDeepSeekVision } from './deepseek-client'
import { logger } from '@/lib/logger'

type CaptionResult = {
  caption: string
  keywords: string[]
  style: string
}
const TAG = 'agents/caption-writer'

function parseJSON(text: string): unknown {
  const cleaned = text.replace(/```json\s*|```/g, '').trim()
  return JSON.parse(cleaned)
}

function normalizeCaptionResult(raw: unknown, confidence: number): CaptionResult {
  const input = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const caption = typeof input.caption === 'string' ? input.caption.trim() : ''
  const style = typeof input.style === 'string' ? input.style.trim() : 'diary'
  const rawKeywords = Array.isArray(input.keywords) ? input.keywords : []

  const banned = new Set(['照片', '情侣', '回忆', '美好时光', '幸福', '温馨', '浪漫'])
  const keywords = rawKeywords
    .filter((k): k is string => typeof k === 'string')
    .map(k => k.trim())
    .filter(k => k.length >= 2 && k.length <= 10 && !banned.has(k))
    .filter((k, idx, arr) => arr.indexOf(k) === idx)
    .slice(0, 5)

  return {
    caption: caption || '这张照片记录了一个值得珍藏的时刻。',
    keywords: confidence >= 0.65 ? keywords : [],
    style,
  }
}

async function writeWithClaude(
  input: PipelineInput,
  analysis: unknown
): Promise<{ text: string; tokens: number; cost: number }> {
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
            text: `你是一位擅长情感表达的文案撰写者。请基于图片可见事实和补充信息生成文案。
要求：
1) 不要臆测图片中不存在的细节；
2) 文案 50-120 字；
3) 关键词 3-5 个，具体、可检索；
4) 只输出 JSON：{"caption":"...","keywords":["..."],"style":"romantic|poetic|diary|photography-note"}
补充信息：${JSON.stringify({
              analysis,
              locationName: input.locationName || null,
              takenAt: input.exif?.takenAt || null,
            })}`,
          },
        ],
      }],
    }),
  })

  const data = await response.json() as {
    content: { text: string }[]
    usage?: { input_tokens: number; output_tokens: number }
  }
  const text = data.content?.[0]?.text || '{}'
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
  return { text, tokens, cost: tokens * 0.000015 }
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

    const systemPrompt = `你是一位擅长情感表达的文案撰写者。根据照片分析结果，为情侣照片生成温暖走心的文案。
风格选择：romantic（浪漫絮语）、poetic（诗意短句）、diary（日记体）、photography-note（摄影手记）。
根据照片情绪自动选择最合适的风格。不要臆测细节。
以 JSON 输出：{"caption":"文案50-120字","keywords":["3-5个具体关键词"],"style":"风格"}`

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
地点：${input.locationName || '未知'}
时间：${input.exif?.takenAt || '未知'}`

    const modelResult = process.env.CLAUDE_API_KEY
      ? await (async () => {
          logger.info(TAG, '使用 Claude 生成文案', { photoId: input.photoId, confidence })
          return writeWithClaude(input, analysis)
        })()
      : await (async () => {
          try {
            logger.info(TAG, '尝试 DeepSeek 视觉生成文案', { photoId: input.photoId, confidence })
            return await callDeepSeekVision(systemPrompt, userPrompt, input.photoUrl, {
              temperature: 0.3,
              maxTokens: 400,
            })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown'
            logger.warn(TAG, '视觉文案失败，降级文本文案', { photoId: input.photoId, error: message })
            return callDeepSeek(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 400 })
          }
        })()

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
