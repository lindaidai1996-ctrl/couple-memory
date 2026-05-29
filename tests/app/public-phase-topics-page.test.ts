import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicPhaseTopicCards,
  buildPublicPhaseTopicUiText,
} from '../../src/app/story/[slug]/topics/phases/page'

test('buildPublicPhaseTopicUiText exposes translated phase-topic copy', () => {
  const uiText = buildPublicPhaseTopicUiText((key, values) =>
    key === 'chapterCount' ? `${values?.count} chapters` : key
  )

  assert.equal(uiText.back, 'back')
  assert.equal(uiText.title, 'title')
  assert.equal(uiText.empty, 'empty')
  assert.equal(uiText.chapterCount(3), '3 chapters')
})

test('buildPublicPhaseTopicCards keeps stage ordering and chapter preview count stable', () => {
  const cards = buildPublicPhaseTopicCards([
    {
      id: 'album_1',
      title: '在海边的春天',
      description: '这是一个更慢也更安静的阶段。',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      chapters: [
        { id: 'chapter_1', title: '海边散步', summary: 'summary 1' },
        { id: 'chapter_2', title: '晚风回家', summary: 'summary 2' },
        { id: 'chapter_3', title: '不会展示', summary: 'summary 3' },
      ],
    },
  ])

  assert.deepEqual(cards, [
    {
      id: 'album_1',
      title: '在海边的春天',
      description: '这是一个更慢也更安静的阶段。',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      chapterCount: 3,
      chapterPreview: ['海边散步', '晚风回家'],
    },
  ])
})
