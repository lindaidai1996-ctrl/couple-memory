import { logger } from '@/lib/logger'

type DeepSeekResponse = {
  choices: { message: { content: string } }[]
  usage?: { total_tokens: number }
}

type DeepSeekOptions = { temperature?: number; maxTokens?: number }
const TAG = 'agents/deepseek-client'

export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  options?: DeepSeekOptions
): Promise<{ text: string; tokens: number; cost: number }> {
  logger.info(TAG, '请求文本模型', {
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 500,
    promptChars: userPrompt.length,
  })

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 500,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    logger.warn(TAG, '文本模型请求失败', { status: response.status, detail: detail.slice(0, 300) })
    throw new Error(`DeepSeek text request failed: ${response.status}`)
  }

  const data = await response.json() as DeepSeekResponse
  const text = data.choices[0].message.content
  const tokens = data.usage?.total_tokens || 0
  logger.info(TAG, '文本模型请求成功', { tokens })

  return { text, tokens, cost: tokens * 0.000002 }
}

export async function callDeepSeekVision(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options?: DeepSeekOptions
): Promise<{ text: string; tokens: number; cost: number }> {
  logger.info(TAG, '请求视觉模型', {
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 500,
    promptChars: userPrompt.length,
    hasImageUrl: Boolean(imageUrl),
  })

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 500,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    logger.warn(TAG, '视觉模型请求失败', { status: response.status, detail: detail.slice(0, 300) })
    throw new Error(`DeepSeek vision request failed: ${response.status}`)
  }

  const data = await response.json() as DeepSeekResponse
  const text = data.choices?.[0]?.message?.content || '{}'
  const tokens = data.usage?.total_tokens || 0
  logger.info(TAG, '视觉模型请求成功', { tokens })

  return { text, tokens, cost: tokens * 0.000002 }
}
