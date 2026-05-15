import type { Agent, PipelineInput, AgentOutput } from './engine/types'

export const photoAnalyzer: Agent = {
  id: 'photoAnalyzer',
  async execute(input: PipelineInput): Promise<AgentOutput> {
    const contextParts: string[] = []
    if (input.locationName) contextParts.push(`地点：${input.locationName}`)
    if (input.exif?.takenAt) contextParts.push(`时间：${String(input.exif.takenAt)}`)
    if (input.exif?.cameraMake) {
      contextParts.push(`相机：${String(input.exif.cameraMake)} ${String(input.exif.cameraModel || '')}`)
    }

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
              text: `你是一位专业摄影师兼情感分析师。请分析这张情侣照片，以 JSON 格式输出：
{
  "scene": "场景描述，20-50字",
  "mood": "情绪氛围，如温馨浪漫、活泼欢快",
  "composition": "构图方式，如三分法、对称、引导线",
  "colorTone": "色调分析，如暖色调、冷色调",
  "subjects": ["主体1", "主体2"],
  "confidence": 0.0-1.0
}
${contextParts.length ? `\n拍摄信息：${contextParts.join('，')}` : ''}
只输出 JSON。`,
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

    return {
      data: JSON.parse(text),
      tokens,
      cost: tokens * 0.000015,
    }
  },
}
