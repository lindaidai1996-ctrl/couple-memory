import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicMetadata,
  resolvePublicMetadata,
  type PublicPageKind,
} from '../../src/lib/public-metadata'

const publicSpace = {
  name: 'Sun & Moon',
  slug: 'sun-moon',
  bio: '我们在城市和海边记录日常。',
  coverPhotoUrl: 'https://img.example.com/cover.jpg',
  isPublic: true,
}

test('buildPublicMetadata builds home metadata from public space fields', () => {
  const metadata = buildPublicMetadata(publicSpace, 'home')

  assert.equal(metadata.title, 'Sun & Moon | Couple Memory')
  assert.equal(metadata.description, '我们在城市和海边记录日常。')
  assert.equal(metadata.alternates?.canonical, '/s/sun-moon')
  assert.equal(metadata.openGraph?.url, '/s/sun-moon')
  assert.deepEqual(metadata.openGraph?.images, [
    {
      url: 'https://img.example.com/cover.jpg',
      alt: 'Sun & Moon',
    },
  ])
  assert.deepEqual(metadata.twitter, {
    card: 'summary_large_image',
    title: 'Sun & Moon | Couple Memory',
    description: '我们在城市和海边记录日常。',
    images: ['https://img.example.com/cover.jpg'],
  })
})

test('buildPublicMetadata uses page-specific copy for photos and timeline pages', () => {
  const cases: Array<[PublicPageKind, string, string, string]> = [
    [
      'photos',
      'Sun & Moon 的照片 | Couple Memory',
      '查看 Sun & Moon 公开空间中的照片记录。我们在城市和海边记录日常。',
      '/s/sun-moon/photos',
    ],
    [
      'timeline',
      'Sun & Moon 的时间轴 | Couple Memory',
      '浏览 Sun & Moon 公开空间的时间轴节点。我们在城市和海边记录日常。',
      '/s/sun-moon/timeline',
    ],
    [
      'review',
      'Sun & Moon 的回顾 | Couple Memory',
      '阅读 Sun & Moon 公开空间整理出的年度与周年回顾。我们在城市和海边记录日常。',
      '/s/sun-moon/review',
    ],
    [
      'topics',
      'Sun & Moon 的专题 | Couple Memory',
      '浏览 Sun & Moon 公开空间整理出的专题内容与足迹总结。我们在城市和海边记录日常。',
      '/s/sun-moon/topics/firsts',
    ],
  ]

  for (const [page, title, description, canonical] of cases) {
    const metadata = buildPublicMetadata(publicSpace, page)

    assert.equal(metadata.title, title)
    assert.equal(metadata.description, description)
    assert.equal(metadata.alternates?.canonical, canonical)
    assert.equal(metadata.openGraph?.url, canonical)
  }
})

test('buildPublicMetadata falls back to noindex metadata for non-public spaces', () => {
  const metadata = buildPublicMetadata(
    {
      ...publicSpace,
      isPublic: false,
    },
    'home'
  )

  assert.equal(metadata.title, '页面不存在 | Couple Memory')
  assert.equal(metadata.description, '你访问的公开空间不存在，或暂未公开。')
  assert.deepEqual(metadata.robots, {
    index: false,
    follow: false,
  })
})

test('resolvePublicMetadata loads a slug and builds page metadata', async () => {
  let resolvedSlug = ''

  const metadata = await resolvePublicMetadata({
    slug: 'sun-moon',
    page: 'photos',
    resolveSpace: async slug => {
      resolvedSlug = slug
      return publicSpace
    },
  })

  assert.equal(resolvedSlug, 'sun-moon')
  assert.equal(metadata.title, 'Sun & Moon 的照片 | Couple Memory')
  assert.equal(metadata.alternates?.canonical, '/s/sun-moon/photos')
})
