import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAlbumSelectionState,
} from '../../../src/app/(dashboard)/albums/[albumId]/page'

test('buildAlbumSelectionState enters album-wide selection mode', () => {
  const state = buildAlbumSelectionState({
    selectionMode: true,
    selectedPhotoIds: ['photo_1', 'photo_2'],
  })

  assert.deepEqual(state, {
    active: true,
    count: 2,
    canCreateChapter: true,
    canMove: true,
    canUngroup: true,
  })
})

test('buildAlbumSelectionState allows moving selected photos to another chapter', () => {
  const state = buildAlbumSelectionState({
    selectionMode: true,
    selectedPhotoIds: ['photo_1'],
  })

  assert.equal(state.canMove, true)
})

test('buildAlbumSelectionState disables actions when selection mode is off', () => {
  const state = buildAlbumSelectionState({
    selectionMode: false,
    selectedPhotoIds: ['photo_1'],
  })

  assert.deepEqual(state, {
    active: false,
    count: 0,
    canCreateChapter: false,
    canMove: false,
    canUngroup: false,
  })
})
