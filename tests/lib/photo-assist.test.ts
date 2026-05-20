import assert from 'node:assert/strict'
import test from 'node:test'

test('buildUngroupedSuggestions returns short moment-first suggestions for ungrouped photos', async () => {
  const mod = await import('../../src/lib/photos/photo-assist').catch(() => null)
  assert.ok(mod && typeof mod.buildUngroupedSuggestions === 'function')

  const suggestions = mod.buildUngroupedSuggestions({
    momentContext: '想留住这一刻',
    momentPromptAnswer: null,
    aiScene: '日落散步',
    locationName: '青岛',
  })

  assert.deepEqual(suggestions, [
    '想留住这一刻',
    '想把这一刻留下来，在青岛。',
  ])
})

test('buildChapterAwareSuggestions returns chapter-aware hints when photo already belongs to a chapter', async () => {
  const mod = await import('../../src/lib/photos/photo-assist').catch(() => null)
  assert.ok(mod && typeof mod.buildChapterAwareSuggestions === 'function')

  const suggestions = mod.buildChapterAwareSuggestions({
    chapterTitle: '第一次一起看海',
    momentContext: null,
    momentPromptAnswer: null,
    aiScene: '海边散步',
    locationName: '青岛',
  })

  assert.deepEqual(suggestions, [
    '这张照片属于“第一次一起看海”这一段回忆。',
    '它可以在章节里作为一个更具体的瞬间表达。',
  ])
})
