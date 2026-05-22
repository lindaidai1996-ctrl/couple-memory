import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCaptionGenerationPrompts,
  captionWriter,
} from '../../../src/lib/agents/caption-writer'

test('buildCaptionGenerationPrompts includes couple preferences in prompt context', () => {
  const prompts = buildCaptionGenerationPrompts(
    {
      photoId: 'photo_prompt_preferences',
      photoUrl: 'https://example.com/photo.jpg',
      exif: { takenAt: '2026-05-22T10:00:00.000Z' },
      width: 1200,
      height: 1600,
      locationName: '厦门',
      preferences: {
        captionStylePreference: 'poetic',
        tonePreference: 'gentle',
        blockedPhrases: ['幸福', '浪漫'],
      },
    },
    {
      mood: '轻松温柔',
      scene: '海边散步',
    },
  )

  assert.match(prompts.systemPrompt, /优先风格：poetic/)
  assert.match(prompts.systemPrompt, /语气倾向：gentle/)
  assert.match(prompts.systemPrompt, /禁用表达：幸福、浪漫/)
  assert.match(prompts.userPrompt, /"locationName":"厦门"/)
})

test('captionWriter falls back when Claude responds non-OK', async (t) => {
  const originalFetch = globalThis.fetch
  const originalClaudeKey = process.env.CLAUDE_API_KEY
  process.env.CLAUDE_API_KEY = 'test-key'

  let requestCount = 0
  globalThis.fetch = async (input) => {
    const url = String(input)
    requestCount += 1

    if (url.includes('anthropic.com')) {
      return new Response('upstream unavailable', { status: 503 })
    }

    if (url.includes('deepseek.com')) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"caption":"回退路径生成了可用文案。","keywords":["回退","文案"],"style":"diary","variants":[{"text":"回退路径生成了可用文案。","style":"diary"}]}',
              },
            },
          ],
          usage: { total_tokens: 18 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalClaudeKey === undefined) {
      delete process.env.CLAUDE_API_KEY
    } else {
      process.env.CLAUDE_API_KEY = originalClaudeKey
    }
  })

  const result = await captionWriter.execute(
    {
      photoId: 'photo_caption',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {
      photoAnalyzer: {
        confidence: 0.9,
        mood: 'calm',
      },
    },
  )

  assert.equal(requestCount, 2)
  assert.deepEqual(result.data, {
    caption: '回退路径生成了可用文案。',
    keywords: ['回退', '文案'],
    style: 'diary',
    variants: [{ text: '回退路径生成了可用文案。', style: 'diary' }],
  })
})

test('captionWriter normalizes selected top-level caption and style into variants', async (t) => {
  const originalFetch = globalThis.fetch
  const originalClaudeKey = process.env.CLAUDE_API_KEY
  delete process.env.CLAUDE_API_KEY

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                caption: '同一句文案作为默认选项。',
                keywords: ['散步', '晚风', '街灯'],
                style: 'diary',
                variants: [
                  { text: '同一句文案作为默认选项。', style: 'poetic' },
                  { text: '换一种更轻的说法。', style: 'diary' },
                ],
              }),
            },
          },
        ],
        usage: { total_tokens: 26 },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalClaudeKey === undefined) {
      delete process.env.CLAUDE_API_KEY
    } else {
      process.env.CLAUDE_API_KEY = originalClaudeKey
    }
  })

  const result = await captionWriter.execute(
    {
      photoId: 'photo_caption_normalization',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {
      photoAnalyzer: {
        confidence: 0.92,
        mood: 'calm',
      },
    },
  )

  assert.deepEqual(result.data, {
    caption: '同一句文案作为默认选项。',
    keywords: ['散步', '晚风', '街灯'],
    style: 'diary',
    variants: [
      { text: '同一句文案作为默认选项。', style: 'diary' },
      { text: '同一句文案作为默认选项。', style: 'poetic' },
      { text: '换一种更轻的说法。', style: 'diary' },
    ],
  })
})

test('captionWriter returns a conservative local caption when analysis confidence is low', async (t) => {
  const originalFetch = globalThis.fetch
  const originalClaudeKey = process.env.CLAUDE_API_KEY
  delete process.env.CLAUDE_API_KEY

  globalThis.fetch = async () => {
    throw new Error('captionWriter should not call upstream models for low-confidence analysis')
  }

  t.after(() => {
    globalThis.fetch = originalFetch
    if (originalClaudeKey === undefined) {
      delete process.env.CLAUDE_API_KEY
    } else {
      process.env.CLAUDE_API_KEY = originalClaudeKey
    }
  })

  const result = await captionWriter.execute(
    {
      photoId: 'photo_caption_conservative',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {
      photoAnalyzer: {
        confidence: 0.12,
        scene: '无法根据现有元数据确认具体场景，需视觉模型识别后再判断。',
        source: 'metadata-only',
      },
    },
  )

  assert.deepEqual(result.data, {
    caption: '和你一起被定格下来的这一刻，本身就已经很珍贵。不急着替风景下定义，光是看见照片里的人是你，心里就会慢慢变得柔软。',
    keywords: [],
    style: 'diary',
    variants: [
      {
        text: '和你一起被定格下来的这一刻，本身就已经很珍贵。不急着替风景下定义，光是看见照片里的人是你，心里就会慢慢变得柔软。',
        style: 'diary',
      },
      {
        text: '这张照片最动人的地方，不一定是场景有多特别，而是我又一次认真记住了和你同框的样子。',
        style: 'poetic',
      },
    ],
  })
})

test('captionWriter uses OpenAI vision when configured and Claude is unavailable', async (t) => {
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
    assert.equal(body.input[0].content[0].type, 'input_text')
    assert.equal(body.input[0].content[1].type, 'input_image')

    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          caption: '海风把傍晚吹得很轻，我们并肩站着，连沉默都像在发光。',
          keywords: ['海边', '海风', '并肩'],
          style: 'poetic',
          variants: [
            { text: '海风把傍晚吹得很轻，我们并肩站着，连沉默都像在发光。', style: 'poetic' },
            { text: '和你站在海边的这一刻，连风都像在替我记住心动。', style: 'romantic' },
          ],
        }),
        usage: {
          input_tokens: 900,
          output_tokens: 120,
          total_tokens: 1020,
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

  const result = await captionWriter.execute(
    {
      photoId: 'photo_caption_openai',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {
      photoAnalyzer: {
        confidence: 0.94,
        scene: '海边的两人合照，背后能看到海面与自然光。',
        mood: '轻松温柔',
      },
    },
  )

  assert.deepEqual(result.data, {
    caption: '海风把傍晚吹得很轻，我们并肩站着，连沉默都像在发光。',
    keywords: ['海边', '海风', '并肩'],
    style: 'poetic',
    variants: [
      { text: '海风把傍晚吹得很轻，我们并肩站着，连沉默都像在发光。', style: 'poetic' },
      { text: '和你站在海边的这一刻，连风都像在替我记住心动。', style: 'romantic' },
    ],
  })
})

test('captionWriter prefers Qwen vision when QWEN_API_KEY is configured', async (t) => {
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

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                caption: '海风和晚霞都在场，而我最想记住的还是你站在我身边的样子。',
                keywords: ['海边', '晚霞', '并肩'],
                style: 'romantic',
                variants: [
                  { text: '海风和晚霞都在场，而我最想记住的还是你站在我身边的样子。', style: 'romantic' },
                  { text: '站在海边的傍晚里，连沉默都像被温柔地收藏起来。', style: 'poetic' },
                ],
              }),
            },
          },
        ],
        usage: {
          total_tokens: 666,
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

  const result = await captionWriter.execute(
    {
      photoId: 'photo_caption_qwen',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1200,
      height: 1600,
      locationName: null,
    },
    {
      photoAnalyzer: {
        confidence: 0.95,
        scene: '海边的两人合照，背后能看到海面与自然光。',
        mood: '轻松温柔',
      },
    },
  )

  assert.deepEqual(result.data, {
    caption: '海风和晚霞都在场，而我最想记住的还是你站在我身边的样子。',
    keywords: ['海边', '晚霞', '并肩'],
    style: 'romantic',
    variants: [
      { text: '海风和晚霞都在场，而我最想记住的还是你站在我身边的样子。', style: 'romantic' },
      { text: '站在海边的傍晚里，连沉默都像被温柔地收藏起来。', style: 'poetic' },
    ],
  })
})
