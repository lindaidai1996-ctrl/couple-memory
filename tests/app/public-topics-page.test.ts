import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublicFirstsSections,
  buildPublicFirstsUiText,
} from '../../src/app/story/[slug]/topics/firsts/page'
import {
  buildPublicFootprintsCards,
  buildPublicFootprintsUiText,
} from '../../src/app/story/[slug]/topics/footprints/page'

test('buildPublicFirstsUiText exposes translated firsts-topic copy', () => {
  const uiText = buildPublicFirstsUiText(key => key)

  assert.equal(uiText.title, 'title')
  assert.equal(uiText.firstMilestone, 'firstMilestone')
  assert.equal(uiText.firstPlace, 'firstPlace')
  assert.equal(uiText.firstPhoto, 'firstPhoto')
})

test('buildPublicFirstsSections keeps the three first-moment slots stable', () => {
  const sections = buildPublicFirstsSections({
    firstMilestone: null,
    firstPlace: {
      id: 'm2',
      title: '广州',
      date: '2026-01-02T00:00:00.000Z',
      locationName: '广州',
      narrative: 'first place',
      imageUrl: null,
    },
    firstPhoto: null,
  })

  assert.equal(sections.length, 3)
  assert.equal(sections[1].item?.title, '广州')
})

test('buildPublicFootprintsUiText exposes translated footprint copy', () => {
  const uiText = buildPublicFootprintsUiText((key, values) =>
    key === 'countLabel' ? `${values?.count} photos` : key
  )

  assert.equal(uiText.title, 'title')
  assert.equal(uiText.countLabel(4), '4 photos')
})

test('buildPublicFootprintsCards derives a stable date range label', () => {
  const cards = buildPublicFootprintsCards([
    {
      locationName: '广州',
      count: 4,
      firstDate: '2026-01-02T00:00:00.000Z',
      lastDate: '2026-02-03T00:00:00.000Z',
      imageUrl: null,
    },
  ])

  assert.equal(cards[0]?.rangeLabel, '2026-01-02 - 2026-02-03')
})
