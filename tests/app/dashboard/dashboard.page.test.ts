import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDashboardCoupleUserQuery,
  buildDashboardReadinessCard,
} from '../../../src/app/(dashboard)/dashboard/page'

test('buildDashboardCoupleUserQuery selects only dashboard fields from couple', () => {
  assert.deepEqual(buildDashboardCoupleUserQuery('user-1'), {
    where: { userId: 'user-1' },
    select: {
      couple: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPublic: true,
          startDate: true,
          _count: { select: { albums: true } },
        },
      },
    },
  })
})

test('buildDashboardReadinessCard returns readiness copy for dashboard rendering', () => {
  assert.deepEqual(buildDashboardReadinessCard({
    score: 68,
    suggestions: ['还有不少照片停留在“其他瞬间”，可以继续整理章节。'],
    actions: [{ label: '继续整理其他瞬间', href: '/albums' }],
  }), {
    score: 68,
    hasSuggestions: true,
    suggestionCount: 1,
    hasActions: true,
    actionCount: 1,
  })
})
