import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPhotoCardStatusCopy,
} from '../../src/components/photo-card'
import {
  buildPhotoDetailCopy,
} from '../../src/components/photo-detail-modal'
import {
  buildPublicPhotosUiText,
} from '../../src/app/s/[slug]/photos/page'
import {
  buildPublicTimelineUiText,
} from '../../src/app/s/[slug]/timeline/page'
import {
  buildErrorUiText,
} from '../../src/app/error'

test('photo card status copy uses translated labels', () => {
  const t = (key: string) =>
    ({
      processing: 'Processing...',
      noPreview: 'No preview',
      processingShort: 'Processing',
      failed: 'Failed',
    })[key] ?? key

  assert.deepEqual(buildPhotoCardStatusCopy(t), {
    processing: 'Processing...',
    noPreview: 'No preview',
    processingShort: 'Processing',
    failed: 'Failed',
  })
})

test('photo detail copy exposes translated tab labels', () => {
  const t = (key: string) =>
    ({
      infoTab: 'Info',
      editTab: 'Edit',
      exifTab: 'EXIF',
    })[key] ?? key

  assert.equal(buildPhotoDetailCopy(t).tabs.info, 'Info')
  assert.equal(buildPhotoDetailCopy(t).tabs.edit, 'Edit')
  assert.equal(buildPhotoDetailCopy(t).tabs.exif, 'EXIF')
})

test('public pages ui text uses translated headings', () => {
  const photosT = (key: string) =>
    ({
      back: 'Back',
      title: 'Photos',
      end: 'You have reached the end',
    })[key] ?? key

  const timelineT = (key: string) =>
    ({
      back: 'Back',
      title: 'Timeline',
      empty: 'No timeline entries yet',
    })[key] ?? key

  assert.deepEqual(buildPublicPhotosUiText(photosT), {
    back: 'Back',
    title: 'Photos',
    end: 'You have reached the end',
  })

  assert.deepEqual(buildPublicTimelineUiText(timelineT), {
    back: 'Back',
    title: 'Timeline',
    empty: 'No timeline entries yet',
  })
})

test('error ui text uses translated button labels', () => {
  const t = (key: string) =>
    ({
      title: 'Something went wrong',
      subtitle: 'Refreshing usually fixes it',
      retry: 'Refresh',
      backHome: 'Back home',
    })[key] ?? key

  assert.deepEqual(buildErrorUiText(t), {
    title: 'Something went wrong',
    subtitle: 'Refreshing usually fixes it',
    retry: 'Refresh',
    backHome: 'Back home',
  })
})
