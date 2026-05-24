import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicHomeSectionOrder,
  buildPublicHomeNarrativeSection,
  buildPublicHomeReviewSection,
  buildPublicHomeTopicSection,
  buildPublicHomeUiText,
} from '../../src/app/s/[slug]/page'

test('buildPublicHomeUiText exposes narrative copy keys', () => {
  const uiText = buildPublicHomeUiText(key => key)

  assert.equal(uiText.narrativeTitle, 'narrativeTitle')
  assert.equal(uiText.narrativeSubtitle, 'narrativeSubtitle')
  assert.equal(uiText.narrativeEmpty, 'narrativeEmpty')
  assert.equal(uiText.chapterLabel, 'chapterLabel')
  assert.equal(uiText.review, 'review')
  assert.equal(uiText.reviewSubtitle, 'reviewSubtitle')
  assert.equal(uiText.topicsTitle, 'topicsTitle')
  assert.equal(uiText.topicsSubtitle, 'topicsSubtitle')
  assert.equal(uiText.topicFirsts, 'topicFirsts')
  assert.equal(uiText.topicFootprints, 'topicFootprints')
  assert.equal(uiText.topicPhases, 'topicPhases')
})

test('buildPublicHomeSectionOrder places the narrative section before navigation cards', () => {
  assert.deepEqual(
    buildPublicHomeSectionOrder({ hasNarrativeAlbums: true }),
    ['hero', 'narrative', 'explore']
  )

  assert.deepEqual(
    buildPublicHomeSectionOrder({ hasNarrativeAlbums: false }),
    ['hero', 'narrative', 'explore']
  )
})

test('buildPublicHomeNarrativeSection summarizes public narrative albums for rendering', () => {
  const section = buildPublicHomeNarrativeSection({
    albums: [
      {
        id: 'album_1',
        title: '2026 春天',
        description: '这段时间的我们，走过海边，也走过晚风。',
        coverPhotoUrl: 'https://img.example.com/a1.jpg',
        chapters: [
          { id: 'chapter_1', title: '海边散步', summary: '海风很轻，我们走得很慢。' },
          { id: 'chapter_2', title: '夜晚散场', summary: '回家的路上还在聊刚刚的晚霞。' },
          { id: 'chapter_3', title: '不会展示', summary: '超过预览数量。' },
        ],
      },
    ],
  })

  assert.equal(section.hasNarrativeAlbums, true)
  assert.equal(section.items.length, 1)
  assert.deepEqual(section.items[0], {
    id: 'album_1',
    title: '2026 春天',
    description: '这段时间的我们，走过海边，也走过晚风。',
    coverPhotoUrl: 'https://img.example.com/a1.jpg',
    chapterPreviewCount: 2,
    chapters: [
      { id: 'chapter_1', title: '海边散步', summary: '海风很轻，我们走得很慢。' },
      { id: 'chapter_2', title: '夜晚散场', summary: '回家的路上还在聊刚刚的晚霞。' },
    ],
  })
})

test('buildPublicHomeReviewSection exposes review entry state', () => {
  const section = buildPublicHomeReviewSection({
    yearlyReviewTitle: '2026 年回顾',
    anniversaryReviewTitle: null,
  })

  assert.equal(section.hasReviews, true)
  assert.equal(section.yearlyReviewTitle, '2026 年回顾')
  assert.equal(section.anniversaryReviewTitle, null)
})

test('buildPublicHomeTopicSection exposes available topic navigation items', () => {
  const section = buildPublicHomeTopicSection({
    slug: 'sun-moon',
    reviews: {
      yearlyReview: {
        id: 'review-1',
        type: 'YEARLY',
        label: '2026',
        title: '2026 年回顾',
        subtitle: null,
        summary: 'summary',
        closing: 'closing',
        coverPhotoUrl: null,
        status: 'READY',
        publishedAt: '2026-05-22T00:00:00.000Z',
        highlights: [],
      },
      anniversaryReview: null,
    },
  })

  assert.equal(section.hasTopics, true)
  assert.deepEqual(section.items.map(item => item.href), [
    '/s/sun-moon/topics/phases',
    '/s/sun-moon/topics/firsts',
    '/s/sun-moon/topics/footprints',
    '/s/sun-moon/review',
    '/s/sun-moon/review/share/yearly',
  ])
})
