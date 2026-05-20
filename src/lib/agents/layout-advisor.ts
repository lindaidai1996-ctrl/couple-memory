import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek } from './deepseek-client'

type LayoutResult = {
  layout: string
  reason: string
  alternatives: string[]
}

function parseJSON(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?\s*|```/g, '').trim()
  return JSON.parse(cleaned)
}

function normalizeLayoutResult(raw: unknown): LayoutResult {
  const input = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const layout = typeof input.layout === 'string' && input.layout.trim().length > 0
    ? input.layout.trim()
    : 'story-card'
  const reason = typeof input.reason === 'string' && input.reason.trim().length > 0
    ? input.reason.trim()
    : '通用卡片布局适合当前照片内容。'
  const alternatives = Array.isArray(input.alternatives)
    ? input.alternatives
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0 && item !== layout)
      .filter((item, idx, arr) => arr.indexOf(item) === idx)
      .slice(0, 3)
    : []

  return { layout, reason, alternatives }
}

export const layoutAdvisor: Agent = {
  id: 'layoutAdvisor',
  async execute(input: PipelineInput, depOutputs: Record<string, unknown>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer
    const aspectRatio = input.width && input.height ? input.width / input.height : 1

    const systemPrompt = `你是一位排版设计师。根据照片特征推荐最佳展示模板。
可选模板：
- cinema-wide：宽幅电影感（适合宽高比>1.5的风景照）
- side-by-side：图文并排（适合有故事的照片）
- portrait-hero：竖构图大图（适合宽高比<0.8的人像）
- grid-square：方格组合（适合1:1比例）
- story-card：卡片式（通用）
以 JSON 输出：{"layout":"模板名","reason":"推荐理由","alternatives":["备选"]}`

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
宽高比：${aspectRatio.toFixed(2)}（${input.width}x${input.height}）`

    const { text, tokens, cost } = await callDeepSeek(systemPrompt, userPrompt)
    return { data: normalizeLayoutResult(parseJSON(text)), tokens, cost }
  },
}
