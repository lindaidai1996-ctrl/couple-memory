import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPhotoAssistMeta,
  buildPhotoPreviewNavigationState,
} from '../../../src/components/photo-detail-modal'

test('buildPhotoAssistMeta shows moment context inputs for ungrouped photos', () => {
  assert.deepEqual(buildPhotoAssistMeta({
    chapterId: null,
  }), {
    isGrouped: false,
    assistTabKey: 'assist',
    showLayoutEditorAsSecondary: true,
  })
})

test('buildPhotoAssistMeta de-emphasizes layout editing for ungrouped photos', () => {
  const meta = buildPhotoAssistMeta({
    chapterId: null,
  })

  assert.equal(meta.showLayoutEditorAsSecondary, true)
})

test('buildPhotoAssistMeta shows chapter-aware helper copy for grouped photos', () => {
  assert.deepEqual(buildPhotoAssistMeta({
    chapterId: 'chapter_1',
  }), {
    isGrouped: true,
    assistTabKey: 'assist',
    showLayoutEditorAsSecondary: true,
  })
})

test('buildPhotoPreviewNavigationState moves only within the current chapter photo list', () => {
  assert.deepEqual(buildPhotoPreviewNavigationState({
    currentPhotoId: 'photo_2',
    chapterPhotoIds: ['photo_1', 'photo_2', 'photo_3'],
  }), {
    hasPrevious: true,
    hasNext: true,
    previousPhotoId: 'photo_1',
    nextPhotoId: 'photo_3',
  })
})

test('buildPhotoPreviewNavigationState disables navigation at chapter boundaries', () => {
  assert.deepEqual(buildPhotoPreviewNavigationState({
    currentPhotoId: 'photo_1',
    chapterPhotoIds: ['photo_1', 'photo_2'],
  }), {
    hasPrevious: false,
    hasNext: true,
    previousPhotoId: null,
    nextPhotoId: 'photo_2',
  })
})
