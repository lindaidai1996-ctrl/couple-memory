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
  buildPublicReviewUiText,
} from '../../src/app/s/[slug]/review/page'
import {
  buildPublicReviewShareUiText,
} from '../../src/app/s/[slug]/review/share/[type]/page'
import {
  buildPublicFirstsUiText,
} from '../../src/app/s/[slug]/topics/firsts/page'
import {
  buildPublicFootprintsUiText,
} from '../../src/app/s/[slug]/topics/footprints/page'
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
  assert.equal(buildPhotoDetailCopy(t).tabs.assist, 'Edit')
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

  const reviewT = (key: string) =>
    ({
      back: 'Back',
      title: 'Reviews',
      subtitle: 'Subtitle',
      yearlyTitle: 'Yearly',
      yearlyEmpty: 'No yearly review',
      anniversaryTitle: 'Anniversary',
      anniversaryEmpty: 'No anniversary review',
    })[key] ?? key

  assert.deepEqual(buildPublicReviewUiText(reviewT), {
    back: 'Back',
    title: 'Reviews',
    subtitle: 'Subtitle',
    yearlyTitle: 'Yearly',
    yearlyEmpty: 'No yearly review',
    anniversaryTitle: 'Anniversary',
    anniversaryEmpty: 'No anniversary review',
  })

  const reviewShareT = (key: string) =>
    ({
      back: 'Back',
      eyebrow: 'Share Card',
      closingLabel: 'Closing',
      highlightsLabel: 'Highlights',
      notFound: 'Not found',
    })[key] ?? key

  assert.deepEqual(buildPublicReviewShareUiText(reviewShareT), {
    back: 'Back',
    eyebrow: 'Share Card',
    closingLabel: 'Closing',
    highlightsLabel: 'Highlights',
    notFound: 'Not found',
  })

  const firstsT = (key: string) =>
    ({
      back: 'Back',
      title: 'Our Firsts',
      subtitle: 'Subtitle',
      firstMilestone: 'First milestone',
      firstPlace: 'First place',
      firstPhoto: 'First photo',
      empty: 'Empty',
    })[key] ?? key

  assert.deepEqual(buildPublicFirstsUiText(firstsT), {
    back: 'Back',
    title: 'Our Firsts',
    subtitle: 'Subtitle',
    firstMilestone: 'First milestone',
    firstPlace: 'First place',
    firstPhoto: 'First photo',
    empty: 'Empty',
  })

  const footprintsT = (key: string, values?: Record<string, string | number>) =>
    ({
      back: 'Back',
      title: 'Footprints',
      subtitle: 'Subtitle',
      countLabel: `${values?.count} photos`,
      empty: 'Empty',
    })[key] ?? key

  const footprintsUiText = buildPublicFootprintsUiText(footprintsT)
  assert.equal(footprintsUiText.back, 'Back')
  assert.equal(footprintsUiText.title, 'Footprints')
  assert.equal(footprintsUiText.subtitle, 'Subtitle')
  assert.equal(footprintsUiText.empty, 'Empty')
  assert.equal(footprintsUiText.countLabel(3), '3 photos')
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
