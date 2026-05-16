import assert from 'node:assert/strict'
import test from 'node:test'

import { reindexPhotoSortOrders } from '../../src/lib/photos/sort-order'

test('reindexPhotoSortOrders rewrites sortOrder sequentially from 1', () => {
  const result = reindexPhotoSortOrders([
    { id: 'p3', sortOrder: 9 },
    { id: 'p1', sortOrder: 2 },
    { id: 'p2', sortOrder: 7 },
  ])

  assert.deepEqual(result, [
    { id: 'p3', sortOrder: 1 },
    { id: 'p1', sortOrder: 2 },
    { id: 'p2', sortOrder: 3 },
  ])
})
