import assert from 'node:assert/strict'
import test from 'node:test'

import { photoAnalyzer } from '../../../src/lib/agents/photo-analyzer'

test('photoAnalyzer returns conservative low-confidence analysis when no visual provider is configured', async () => {
  const originalClaudeKey = process.env.CLAUDE_API_KEY
  delete process.env.CLAUDE_API_KEY

  const result = await photoAnalyzer.execute(
    {
      photoId: 'photo_metadata_only',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {},
  )

  if (originalClaudeKey === undefined) {
    delete process.env.CLAUDE_API_KEY
  } else {
    process.env.CLAUDE_API_KEY = originalClaudeKey
  }

  assert.deepEqual(result.data, {
    scene: '无法根据现有元数据确认具体场景，需视觉模型识别后再判断。',
    mood: '未知',
    composition: '未识别',
    colorTone: '未识别',
    subjects: ['两人'],
    confidence: 0.12,
    source: 'metadata-only',
  })
  assert.equal(result.tokens, 0)
  assert.equal(result.cost, 0)
})

test('photoAnalyzer uses OpenAI vision when OPENAI_API_KEY is configured', async (t) => {
  const originalFetch = globalThis.fetch
  const originalClaudeKey = process.env.CLAUDE_API_KEY
  const originalOpenAIKey = process.env.OPENAI_API_KEY
  delete process.env.CLAUDE_API_KEY
  process.env.OPENAI_API_KEY = 'test-openai-key'

  globalThis.fetch = async (input, init) => {
    const url = String(input)
    assert.equal(url, 'https://api.openai.com/v1/responses')

    const body = JSON.parse(String(init?.body))
    assert.equal(body.model, 'gpt-4.1-mini')
    assert.equal(body.instructions.includes('你是一位专业摄影师兼情感分析师'), true)
    assert.equal(body.input[0].content[0].type, 'input_text')
    assert.equal(body.input[0].content[1].type, 'input_image')
    assert.equal(body.input[0].content[1].image_url, 'https://example.com/photo.jpg')

    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          scene: '海边的两人合照，背后能看到海面与自然光。',
          mood: '轻松温柔',
          composition: '环境人像',
          colorTone: '暖调自然光',
          subjects: ['两人', '海面'],
          confidence: 0.91,
        }),
        usage: {
          input_tokens: 1200,
          output_tokens: 180,
          total_tokens: 1380,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalClaudeKey === undefined) delete process.env.CLAUDE_API_KEY
    else process.env.CLAUDE_API_KEY = originalClaudeKey
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalOpenAIKey
  })

  const result = await photoAnalyzer.execute(
    {
      photoId: 'photo_openai',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {},
  )

  assert.deepEqual(result.data, {
    scene: '海边的两人合照，背后能看到海面与自然光。',
    mood: '轻松温柔',
    composition: '环境人像',
    colorTone: '暖调自然光',
    subjects: ['两人', '海面'],
    confidence: 0.91,
  })
  assert.equal(result.tokens, 1380)
})

test('photoAnalyzer prefers Qwen vision when QWEN_API_KEY is configured', async (t) => {
  const originalFetch = globalThis.fetch
  const originalClaudeKey = process.env.CLAUDE_API_KEY
  const originalOpenAIKey = process.env.OPENAI_API_KEY
  const originalQwenKey = process.env.QWEN_API_KEY
  delete process.env.CLAUDE_API_KEY
  process.env.OPENAI_API_KEY = 'test-openai-key'
  process.env.QWEN_API_KEY = 'test-qwen-key'

  globalThis.fetch = async (input, init) => {
    const url = String(input)
    assert.equal(url, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')

    const body = JSON.parse(String(init?.body))
    assert.equal(body.model, 'qwen-vl-plus')
    assert.equal(body.messages[1].content[0].type, 'text')
    assert.equal(body.messages[1].content[1].type, 'image_url')
    assert.equal(body.messages[1].content[1].image_url.url, 'https://example.com/photo.jpg')

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                scene: '海边的两人合照，背后能看到海面与自然光。',
                mood: '轻松温柔',
                composition: '环境人像',
                colorTone: '暖调自然光',
                subjects: ['两人', '海面'],
                confidence: 0.93,
              }),
            },
          },
        ],
        usage: {
          total_tokens: 888,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalClaudeKey === undefined) delete process.env.CLAUDE_API_KEY
    else process.env.CLAUDE_API_KEY = originalClaudeKey
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalOpenAIKey
    if (originalQwenKey === undefined) delete process.env.QWEN_API_KEY
    else process.env.QWEN_API_KEY = originalQwenKey
  })

  const result = await photoAnalyzer.execute(
    {
      photoId: 'photo_qwen',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {},
  )

  assert.deepEqual(result.data, {
    scene: '海边的两人合照，背后能看到海面与自然光。',
    mood: '轻松温柔',
    composition: '环境人像',
    colorTone: '暖调自然光',
    subjects: ['两人', '海面'],
    confidence: 0.93,
  })
  assert.equal(result.tokens, 888)
})
