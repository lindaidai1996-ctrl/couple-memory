import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAlbumCover } from '../../src/lib/covers/album-cover'

test('resolveAlbumCover uses first ready photo in auto mode', () => {
  const result = resolveAlbumCover({
    coverMode: 'AUTO',
    coverPhotoId: null,
    photos: [
      {
        id: 'p1',
        status: 'READY',
        displayUrl: 'https://cdn.example.com/p1.jpg',
        sortOrder: 1,
      },
    ],
  })

  assert.equal(result?.photoId, 'p1')
  assert.equal(result?.coverUrl, 'https://cdn.example.com/p1.jpg')
})
