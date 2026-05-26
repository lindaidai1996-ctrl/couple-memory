import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPhotoUploaderDropzoneClassName,
  buildPhotoUploaderProgressFillClassName,
  buildPhotoUploaderProgressTrackClassName,
  buildPhotoUploaderUploadItemClassName,
  formatUploadProgressPercent,
} from '../../src/components/photo-uploader'

test('photo uploader uses velvet plum dropzone and progress surface classes', () => {
  assert.match(buildPhotoUploaderDropzoneClassName(), /\bcm-upload-dropzone\b/)
  assert.match(buildPhotoUploaderUploadItemClassName('uploading'), /\bcm-upload-progress-item\b/)
  assert.match(buildPhotoUploaderProgressTrackClassName(), /\bcm-upload-progress-track\b/)
  assert.match(buildPhotoUploaderProgressFillClassName(), /\bcm-upload-progress-fill\b/)
})

test('formatUploadProgressPercent clamps upload progress for display', () => {
  assert.equal(formatUploadProgressPercent(-12), '0%')
  assert.equal(formatUploadProgressPercent(38.4), '38%')
  assert.equal(formatUploadProgressPercent(120), '100%')
})
