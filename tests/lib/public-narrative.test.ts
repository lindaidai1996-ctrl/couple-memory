import assert from 'node:assert/strict'
import test from 'node:test'

import { mapPublicNarrativeAlbums } from '../../src/lib/public-metadata'

test('mapPublicNarrativeAlbums keeps only albums with narrative content and normalizes chapter summaries', () => {
  const albums = mapPublicNarrativeAlbums([
    {
      id: 'album_1',
      title: '2026 春天',
      description: '我们把海边和城市里的日常都放进了这一段时间。',
      coverPhotoUrl: 'https://img.example.com/a1.jpg',
      chapters: [
        { id: 'chapter_1', title: '海边散步', aiSummary: '海风很轻，我们走得很慢。', sortOrder: 1 },
        { id: 'chapter_2', title: '下雨天', aiSummary: null, sortOrder: 2 },
      ],
      sortOrder: 2,
    },
    {
      id: 'album_2',
      title: '空白相册',
      description: null,
      coverPhotoUrl: null,
      chapters: [
        { id: 'chapter_3', title: '没有摘要', aiSummary: null, sortOrder: 1 },
      ],
      sortOrder: 1,
    },
  ])

  assert.deepEqual(albums, [
    {
      id: 'album_1',
      title: '2026 春天',
      description: '我们把海边和城市里的日常都放进了这一段时间。',
      coverPhotoUrl: 'https://img.example.com/a1.jpg',
      chapters: [
        { id: 'chapter_1', title: '海边散步', summary: '海风很轻，我们走得很慢。' },
      ],
    },
  ])
})
