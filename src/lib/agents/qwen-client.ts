import { logger } from '@/lib/logger'

type QwenResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    total_tokens?: number
  }
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

type QwenOptions = {
  temperature?: number
  maxTokens?: number
  model?: string
}

const TAG = 'agents/qwen-client'

function getQwenBaseUrl() {
  return (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
}

function buildQwenErrorMessage(
  status: number,
  payload: QwenResponse | null,
  detail: string,
  requestId: string | null,
) {
  const code = payload?.error?.code ?? payload?.error?.type ?? null
  const message = payload?.error?.message?.trim() || detail.trim() || 'Unknown Qwen error'
  const parts = [`Qwen vision request failed: ${status}`]

  if (code) {
    parts.push(`[${code}]`)
  }
  parts.push(message)
  if (requestId) {
    parts.push(`(request_id: ${requestId})`)
  }

  return parts.join(' ')
}

export async function callQwenVision(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options?: QwenOptions,
): Promise<{ text: string; tokens: number; cost: number }> {
  const model = options?.model ?? process.env.QWEN_VISION_MODEL ?? 'qwen-vl-plus'
  const url = `${getQwenBaseUrl()}/chat/completions`

  logger.info(TAG, '请求 Qwen 视觉模型', {
    model,
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 500,
    promptChars: userPrompt.length,
    hasImageUrl: Boolean(imageUrl),
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model,
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
    let payload: QwenResponse | null = null
    try {
      payload = detail ? JSON.parse(detail) as QwenResponse : null
    } catch {
      payload = null
    }
    const requestId = response.headers.get('x-request-id') ?? response.headers.get('x-acs-request-id')
    const errorMessage = buildQwenErrorMessage(response.status, payload, detail, requestId)
    logger.warn(TAG, 'Qwen 视觉模型请求失败', {
      status: response.status,
      requestId,
      code: payload?.error?.code ?? payload?.error?.type ?? null,
      message: payload?.error?.message ?? null,
      detail: detail.slice(0, 300),
    })
    throw new Error(errorMessage)
  }

  const data = await response.json() as QwenResponse
  const text = data.choices?.[0]?.message?.content || '{}'
  const tokens = data.usage?.total_tokens || 0
  logger.info(TAG, 'Qwen 视觉模型请求成功', { model, tokens })

  return { text, tokens, cost: 0 }
}
