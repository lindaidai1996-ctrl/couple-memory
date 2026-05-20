import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { logger } from '@/lib/logger'
import { callQwenVision } from './qwen-client'
import { callOpenAIVision } from './openai-client'

const ANALYSIS_PROMPT = `你是一位专业摄影师兼情感分析师。请分析这张情侣照片的拍摄信息，以 JSON 格式输出：
{
  "scene": "场景描述，20-50字",
  "mood": "情绪氛围，如温馨浪漫、活泼欢快",
  "composition": "构图方式，如三分法、对称、引导线",
  "colorTone": "色调分析，如暖色调、冷色调",
  "subjects": ["主体1", "主体2"],
  "confidence": 0.0-1.0
}
只输出 JSON。`
const TAG = 'agents/photo-analyzer'

type AnalysisResult = {
  scene: string
  mood: string
  composition: string
  colorTone: string
  subjects: string[]
  confidence: number
  source?: string
}

export function buildMetadataOnlyAnalysis(input: PipelineInput): AnalysisResult {
  const scene = input.locationName
    ? `仅能根据地点信息推测拍摄与“${input.locationName}”相关，具体场景仍需视觉模型识别确认。`
    : '无法根据现有元数据确认具体场景，需视觉模型识别后再判断。'

  return {
    scene,
    mood: '未知',
    composition: '未识别',
    colorTone: '未识别',
    subjects: ['两人'],
    confidence: input.locationName ? 0.2 : 0.12,
    source: 'metadata-only',
  }
}

async function analyzeWithClaude(input: PipelineInput, contextParts: string[]): Promise<AgentOutput> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: input.photoUrl } },
          {
            type: 'text',
            text: `${ANALYSIS_PROMPT}${contextParts.length ? `\n拍摄信息：${contextParts.join('，')}` : ''}`,
          },
        ],
      }],
    }),
  })

  const data = await response.json() as {
    content: { text: string }[]
    usage?: { input_tokens: number; output_tokens: number }
  }
  const text = data.content[0].text
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

  return { data: JSON.parse(text), tokens, cost: tokens * 0.000015 }
}

async function analyzeWithOpenAI(input: PipelineInput, contextParts: string[]): Promise<AgentOutput> {
  const userPrompt = contextParts.length
    ? `请优先依据图片可见事实分析这张照片，并参考这些补充信息：\n${contextParts.join('\n')}`
    : '请依据图片可见事实分析这张情侣照片，不要臆测画面中不存在的细节。'

  const { text, tokens, cost } = await callOpenAIVision(ANALYSIS_PROMPT, userPrompt, input.photoUrl, {
    temperature: 0.2,
    maxTokens: 500,
  })

  const cleaned = text.replace(/```json\s*|```/g, '').trim()
  return { data: JSON.parse(cleaned), tokens, cost }
}

async function analyzeWithQwen(input: PipelineInput, contextParts: string[]): Promise<AgentOutput> {
  const userPrompt = contextParts.length
    ? `请优先依据图片可见事实分析这张照片，并参考这些补充信息：\n${contextParts.join('\n')}`
    : '请依据图片可见事实分析这张情侣照片，不要臆测画面中不存在的细节。'

  const { text, tokens, cost } = await callQwenVision(ANALYSIS_PROMPT, userPrompt, input.photoUrl, {
    temperature: 0.2,
    maxTokens: 500,
  })

  const cleaned = text.replace(/```json\s*|```/g, '').trim()
  return { data: JSON.parse(cleaned), tokens, cost }
}

export const photoAnalyzer: Agent = {
  id: 'photoAnalyzer',
  async execute(input: PipelineInput): Promise<AgentOutput> {
    const contextParts: string[] = []
    if (input.locationName) contextParts.push(`地点：${input.locationName}`)
    if (input.exif?.takenAt) contextParts.push(`时间：${String(input.exif.takenAt)}`)
    if (input.exif?.cameraMake) {
      contextParts.push(`相机：${String(input.exif.cameraMake)} ${String(input.exif.cameraModel || '')}`)
    }

    if (process.env.QWEN_API_KEY) {
      logger.info(TAG, '使用 Qwen 视觉分析', { photoId: input.photoId })
      return analyzeWithQwen(input, contextParts)
    }
    if (process.env.OPENAI_API_KEY) {
      logger.info(TAG, '使用 OpenAI 视觉分析', { photoId: input.photoId })
      return analyzeWithOpenAI(input, contextParts)
    }
    if (process.env.CLAUDE_API_KEY) {
      logger.info(TAG, '使用 Claude 视觉分析', { photoId: input.photoId })
      return analyzeWithClaude(input, contextParts)
    }
    logger.info(TAG, '未配置可用视觉模型，返回保守元数据分析', { photoId: input.photoId })
    return {
      data: buildMetadataOnlyAnalysis(input),
      tokens: 0,
      cost: 0,
    }
  },
}
