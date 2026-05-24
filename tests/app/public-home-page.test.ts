import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicHomeNarrativeShellClassName,
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

test('buildPublicHomeNarrativeShellClassName softens the hero to narrative handoff', () => {
  assert.match(
    buildPublicHomeNarrativeShellClassName(true),
    /-mt-16/
  )
  assert.match(
    buildPublicHomeNarrativeShellClassName(true),
    /rounded-t-\[2rem\]/
  )
  assert.match(
    buildPublicHomeNarrativeShellClassName(false),
    /pt-24/
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
    layout: 'imageLeft',
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

test('buildPublicHomeNarrativeSection alternates card rhythm and trims overly dense copy', () => {
  const longDescription =
    '这是一段很长的相册说明，长到如果完整放在首页叙事层里，就会让卡片正文显得过密，打断阅读节奏，也会让章节摘要失去呼吸感。'
  const longSummary =
    '这是一个同样很长的章节摘要，用来验证公开页叙事层会主动收紧篇幅，而不是把所有说明不加区分地堆在首页卡片里。'

  const section = buildPublicHomeNarrativeSection({
    albums: [
      {
        id: 'album_1',
        title: '2026 春天',
        description: longDescription,
        coverPhotoUrl: 'https://img.example.com/a1.jpg',
        chapters: [{ id: 'chapter_1', title: '海边散步', summary: longSummary }],
      },
      {
        id: 'album_2',
        title: '2026 夏天',
        description: '第二张卡片应该反向排布，避免连续页面节奏过于单调。',
        coverPhotoUrl: 'https://img.example.com/a2.jpg',
        chapters: [{ id: 'chapter_2', title: '晚风散步', summary: '第二章摘要。' }],
      },
    ],
  })

  assert.equal(section.items[0]?.layout, 'imageLeft')
  assert.equal(section.items[1]?.layout, 'imageRight')
  assert.equal(section.items[0]?.description.endsWith('…'), true)
  assert.equal(section.items[0]?.chapters[0]?.summary.endsWith('…'), true)
  assert.equal(section.items[0]?.description.length <= 97, true)
  assert.equal(section.items[0]?.chapters[0]?.summary.length <= 73, true)
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
