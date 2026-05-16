import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAlbumsUiText,
} from '../../../src/app/(dashboard)/albums/page'
import {
  buildTimelineUiText,
} from '../../../src/app/(dashboard)/timeline/page'

test('buildAlbumsUiText returns translated primary copy', () => {
  const t = (key: string) =>
    ({
      title: 'Albums',
      create: 'New album',
      empty: 'No albums yet. Create one to get started.',
    })[key] ?? key

  assert.deepEqual(buildAlbumsUiText(t), {
    title: 'Albums',
    create: 'New album',
    empty: 'No albums yet. Create one to get started.',
  })
})

test('buildTimelineUiText returns translated primary copy', () => {
  const t = (key: string) =>
    ({
      title: 'Timeline',
      create: 'Add milestone',
      empty: 'No milestones yet',
    })[key] ?? key

  assert.deepEqual(buildTimelineUiText(t), {
    title: 'Timeline',
    create: 'Add milestone',
    empty: 'No milestones yet',
  })
})
