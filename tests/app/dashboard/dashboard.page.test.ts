import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDashboardCoupleUserQuery } from '../../../src/app/(dashboard)/dashboard/page'

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
