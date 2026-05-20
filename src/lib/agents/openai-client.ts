import { logger } from '@/lib/logger'

type OpenAIResponsesUsage = {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

type OpenAIResponsesOutput = {
  type?: string
  content?: Array<{
    type?: string
    text?: string
  }>
}

type OpenAIResponsesPayload = {
  output_text?: string
  output?: OpenAIResponsesOutput[]
  usage?: OpenAIResponsesUsage
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

type OpenAIOptions = {
  temperature?: number
  maxTokens?: number
  model?: string
}

const TAG = 'agents/openai-client'

function buildOpenAIErrorMessage(
  status: number,
  payload: OpenAIResponsesPayload | null,
  detail: string,
  requestId: string | null,
) {
  const code = payload?.error?.code ?? payload?.error?.type ?? null
  const message = payload?.error?.message?.trim() || detail.trim() || 'Unknown OpenAI error'
  const parts = [`OpenAI vision request failed: ${status}`]

  if (code) {
    parts.push(`[${code}]`)
  }
  parts.push(message)
  if (requestId) {
    parts.push(`(request_id: ${requestId})`)
  }

  return parts.join(' ')
}

function extractOutputText(payload: OpenAIResponsesPayload): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  const textParts = (payload.output ?? [])
    .flatMap(item => item.content ?? [])
    .filter(part => part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text as string)

  return textParts.join('\n').trim() || '{}'
}

export async function callOpenAIVision(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options?: OpenAIOptions,
): Promise<{ text: string; tokens: number; cost: number }> {
  const model = options?.model ?? process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini'

  logger.info(TAG, '请求 OpenAI 视觉模型', {
    model,
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 500,
    promptChars: userPrompt.length,
    hasImageUrl: Boolean(imageUrl),
  })

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: userPrompt },
            { type: 'input_image', image_url: imageUrl, detail: 'high' },
          ],
        },
      ],
      temperature: options?.temperature ?? 0.3,
      max_output_tokens: options?.maxTokens ?? 500,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    let payload: OpenAIResponsesPayload | null = null
    try {
      payload = detail ? JSON.parse(detail) as OpenAIResponsesPayload : null
    } catch {
      payload = null
    }
    const requestId = response.headers.get('x-request-id')
    const errorMessage = buildOpenAIErrorMessage(response.status, payload, detail, requestId)
    logger.warn(TAG, 'OpenAI 视觉模型请求失败', {
      status: response.status,
      requestId,
      code: payload?.error?.code ?? payload?.error?.type ?? null,
      message: payload?.error?.message ?? null,
      detail: detail.slice(0, 300),
    })
    throw new Error(errorMessage)
  }

  const data = await response.json() as OpenAIResponsesPayload
  const text = extractOutputText(data)
  const tokens = data.usage?.total_tokens
    ?? ((data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0))

  logger.info(TAG, 'OpenAI 视觉模型请求成功', { model, tokens })

  return { text, tokens, cost: 0 }
}
