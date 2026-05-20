import assert from 'node:assert/strict'
import test from 'node:test'

import { callOpenAIVision } from '../../../src/lib/agents/openai-client'

test('callOpenAIVision extracts output_text and token usage from Responses API', async (t) => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'test-openai-key'

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        output_text: '{"scene":"海边","confidence":0.9}',
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          total_tokens: 120,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  })

  const result = await callOpenAIVision('system', 'user', 'https://example.com/photo.jpg')

  assert.deepEqual(result, {
    text: '{"scene":"海边","confidence":0.9}',
    tokens: 120,
    cost: 0,
  })
})

test('callOpenAIVision surfaces OpenAI error code and message in thrown error', async (t) => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = 'test-openai-key'

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: 'You exceeded your current quota, please check your plan and billing details.',
          type: 'insufficient_quota',
          code: 'insufficient_quota',
        },
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_test_123' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
  })

  await assert.rejects(
    () => callOpenAIVision('system', 'user', 'https://example.com/photo.jpg'),
    (error: unknown) => {
      assert.equal(error instanceof Error, true)
      assert.match((error as Error).message, /429/)
      assert.match((error as Error).message, /insufficient_quota/)
      assert.match((error as Error).message, /billing details/)
      assert.match((error as Error).message, /req_test_123/)
      return true
    },
  )
})
