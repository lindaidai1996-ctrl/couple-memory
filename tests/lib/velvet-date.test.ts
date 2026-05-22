import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCalendarMonth,
  formatDateForDisplay,
  getMonthLabel,
  normalizeIsoDate,
  parseIsoDate,
  shiftMonth,
} from '../../src/lib/velvet-date'

test('parseIsoDate accepts valid yyyy-mm-dd values', () => {
  assert.deepEqual(parseIsoDate('2026-05-22'), {
    year: 2026,
    monthIndex: 4,
    dayOfMonth: 22,
  })
})

test('parseIsoDate rejects invalid calendar dates', () => {
  assert.equal(parseIsoDate('2026-02-30'), null)
  assert.equal(parseIsoDate('not-a-date'), null)
})

test('normalizeIsoDate returns empty string for invalid dates', () => {
  assert.equal(normalizeIsoDate('2026-02-30'), '')
  assert.equal(normalizeIsoDate(null), '')
})

test('shiftMonth crosses year boundaries', () => {
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, monthIndex: 11 })
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, monthIndex: 0 })
})

test('buildCalendarMonth returns a six-week grid including leading and trailing days', () => {
  const days = buildCalendarMonth(2026, 4)

  assert.equal(days.length, 42)
  assert.deepEqual(days[0], {
    iso: '2026-04-26',
    dayOfMonth: 26,
    inCurrentMonth: false,
  })
  assert.deepEqual(days[41], {
    iso: '2026-06-06',
    dayOfMonth: 6,
    inCurrentMonth: false,
  })
  assert.equal(days.filter(day => day.inCurrentMonth).length, 31)
})

test('formatDateForDisplay and getMonthLabel produce localized editorial labels', () => {
  assert.match(formatDateForDisplay('2026-05-22', 'en-US'), /May/)
  assert.match(getMonthLabel(2026, 4, 'en-US'), /May/)
})
