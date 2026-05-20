import assert from 'node:assert/strict'
import test from 'node:test'

import { callQwenVision } from '../../../src/lib/agents/qwen-client'

test('callQwenVision extracts content and token usage from compatible chat completions', async (t) => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.QWEN_API_KEY
  process.env.QWEN_API_KEY = 'test-qwen-key'

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"scene":"海边","confidence":0.9}',
            },
          },
        ],
        usage: {
          total_tokens: 321,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.QWEN_API_KEY
    else process.env.QWEN_API_KEY = originalKey
  })

  const result = await callQwenVision('system', 'user', 'https://example.com/photo.jpg')

  assert.deepEqual(result, {
    text: '{"scene":"海边","confidence":0.9}',
    tokens: 321,
    cost: 0,
  })
})

test('callQwenVision surfaces status and provider message in thrown error', async (t) => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.QWEN_API_KEY
  process.env.QWEN_API_KEY = 'test-qwen-key'

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: 'Access denied due to quota exceeded.',
          code: 'QuotaExceeded',
        },
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_qwen_123' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.QWEN_API_KEY
    else process.env.QWEN_API_KEY = originalKey
  })

  await assert.rejects(
    () => callQwenVision('system', 'user', 'https://example.com/photo.jpg'),
    (error: unknown) => {
      assert.equal(error instanceof Error, true)
      assert.match((error as Error).message, /429/)
      assert.match((error as Error).message, /QuotaExceeded/)
      assert.match((error as Error).message, /quota exceeded/i)
      assert.match((error as Error).message, /req_qwen_123/)
      return true
    },
  )
})
