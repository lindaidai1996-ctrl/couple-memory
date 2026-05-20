import assert from 'node:assert/strict'
import test from 'node:test'

test('generateChapterSummary returns a short summary grounded in chapter data', async () => {
  const mod = await import('../../src/lib/albums/chapter-summary-generator').catch(() => null)
  assert.ok(mod && typeof mod.generateChapterSummary === 'function')

  const summary = await mod.generateChapterSummary({
    title: '第一次一起看海',
    backgroundNote: '',
    photoCount: 3,
    scenes: ['海边散步'],
    locations: ['青岛'],
  })

  assert.equal(summary, '这一段回忆发生在青岛，围绕海边散步展开，共收进了 3 张照片。')
})

test('generateChapterSummary falls back to background note when AI is unavailable', async () => {
  const mod = await import('../../src/lib/albums/chapter-summary-generator').catch(() => null)
  assert.ok(mod && typeof mod.generateChapterSummary === 'function')

  const summary = await mod.generateChapterSummary({
    title: '第一次一起看海',
    backgroundNote: '那天风很大，但我们待了很久。',
    photoCount: 2,
    scenes: [],
    locations: [],
  })

  assert.equal(summary, '那天风很大，但我们待了很久。')
})
