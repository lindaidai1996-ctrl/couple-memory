import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAlbumDetailUiText,
} from '../../src/app/(dashboard)/albums/[albumId]/page'
import {
  buildUploaderStageLabels,
} from '../../src/components/photo-uploader'
import {
  buildLayoutUiText,
} from '../../src/components/layouts/cinema-wide'

test('buildAlbumDetailUiText returns translated batch action labels', () => {
  const t = (key: string) =>
    ({
      photoCount: '12 photos',
      selectedCount: 'Selected 3',
      moveSelected: 'Move selected',
      deleteSelected: 'Delete selected',
      reorder: 'Reorder photos',
    })[key] ?? key

  const copy = buildAlbumDetailUiText(t)
  assert.equal(copy.photoCount(12), '12 photos')
  assert.equal(copy.selectedCount(3), 'Selected 3')
  assert.equal(copy.moveSelected, 'Move selected')
  assert.equal(copy.deleteSelected, 'Delete selected')
  assert.equal(copy.reorder, 'Reorder photos')
})

test('buildUploaderStageLabels returns translated upload states', () => {
  const t = (key: string) =>
    ({
      pending: 'Queued',
      compressing: 'Compressing',
      uploading: 'Uploading',
      confirming: 'Confirming',
      done: 'Done',
      error: 'Failed',
    })[key] ?? key

  assert.deepEqual(buildUploaderStageLabels(t), {
    pending: 'Queued',
    compressing: 'Compressing',
    uploading: 'Uploading',
    confirming: 'Confirming',
    done: 'Done',
    error: 'Failed',
  })
})

test('buildLayoutUiText returns translated empty placeholder', () => {
  const t = (key: string) =>
    ({
      noImage: 'No image',
    })[key] ?? key

  assert.deepEqual(buildLayoutUiText(t), {
    noImage: 'No image',
  })
})
