import assert from 'node:assert/strict'
import test from 'node:test'

test('suggestChapterTitles returns one or two short title suggestions', async () => {
  const mod = await import('../../src/lib/albums/chapter-title-suggester').catch(() => null)
  assert.ok(mod && typeof mod.suggestChapterTitles === 'function')

  const suggestions = await mod.suggestChapterTitles({
    albumTitle: '2024',
    photoCount: 2,
    scenes: ['海边散步'],
    locations: ['青岛'],
  })

  assert.equal(Array.isArray(suggestions), true)
  assert.equal(suggestions.length >= 1 && suggestions.length <= 2, true)
  assert.equal(typeof suggestions[0], 'string')
})

test('suggestChapterTitles falls back to deterministic suggestions when AI is unavailable', async () => {
  const mod = await import('../../src/lib/albums/chapter-title-suggester').catch(() => null)
  assert.ok(mod && typeof mod.suggestChapterTitles === 'function')

  const suggestions = await mod.suggestChapterTitles({
    albumTitle: '2024',
    photoCount: 1,
    scenes: [],
    locations: [],
  })

  assert.deepEqual(suggestions, [
    '想留下来的这一刻',
  ])
})
