import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAlbumMemorySiteReadiness } from '../../src/app/api/couples/[coupleId]/albums/route'

test('buildAlbumMemorySiteReadiness exposes chapter and eligible-photo counts for memory-site generation', () => {
  const readiness = buildAlbumMemorySiteReadiness({
    chapters: [
      { id: 'chapter_1', photos: [] },
      { id: 'chapter_2', photos: [{ id: 'photo_1' }] },
      { id: 'chapter_3', photos: [{ id: 'photo_2' }, { id: 'photo_3' }] },
    ],
  })

  assert.deepEqual(readiness, {
    chapterCount: 3,
    eligiblePhotoCount: 3,
  })
})
