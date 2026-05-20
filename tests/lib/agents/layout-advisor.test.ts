import assert from 'node:assert/strict'
import test from 'node:test'

import { layoutAdvisor } from '../../../src/lib/agents/layout-advisor'

test('layoutAdvisor parses fenced JSON responses from DeepSeek', async (t) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '```json\n{"layout":"cinema-wide","reason":"适合宽幅画面。","alternatives":["story-card","side-by-side"]}\n```',
            },
          },
        ],
        usage: { total_tokens: 42 },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await layoutAdvisor.execute(
    {
      photoId: 'photo_layout',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 1600,
      height: 900,
      locationName: null,
    },
    {
      photoAnalyzer: {
        scene: 'beach',
      },
    },
  )

  assert.deepEqual(result.data, {
    layout: 'cinema-wide',
    reason: '适合宽幅画面。',
    alternatives: ['story-card', 'side-by-side'],
  })
})

test('layoutAdvisor falls back when reason or alternatives are missing or malformed', async (t) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                layout: 'portrait-hero',
                reason: ['bad-shape'],
                alternatives: ['portrait-hero', ' story-card ', '', 123, 'story-card'],
              }),
            },
          },
        ],
        usage: { total_tokens: 21 },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )

  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await layoutAdvisor.execute(
    {
      photoId: 'photo_layout_normalization',
      photoUrl: 'https://example.com/photo.jpg',
      exif: null,
      width: 900,
      height: 1400,
      locationName: null,
    },
    {
      photoAnalyzer: {
        scene: 'indoor',
      },
    },
  )

  assert.deepEqual(result.data, {
    layout: 'portrait-hero',
    reason: '通用卡片布局适合当前照片内容。',
    alternatives: ['story-card'],
  })
})
