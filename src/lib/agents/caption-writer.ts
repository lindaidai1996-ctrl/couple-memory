import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek } from './deepseek-client'

export const captionWriter: Agent = {
  id: 'captionWriter',
  async execute(input: PipelineInput, depOutputs: Record<string, unknown>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer

    const systemPrompt = `你是一位擅长情感表达的文案撰写者。根据照片分析结果，为情侣照片生成温暖走心的文案。
风格选择：romantic（浪漫絮语）、poetic（诗意短句）、diary（日记体）、photography-note（摄影手记）。
根据照片情绪自动选择最合适的风格。以 JSON 输出：{"caption":"文案50-150字","keywords":["关键词"],"style":"风格"}`

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
地点：${input.locationName || '未知'}
时间：${input.exif?.takenAt || '未知'}`

    const { text, tokens, cost } = await callDeepSeek(systemPrompt, userPrompt)
    return { data: JSON.parse(text), tokens, cost }
  },
}
