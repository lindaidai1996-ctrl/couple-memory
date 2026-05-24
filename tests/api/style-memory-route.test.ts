import assert from 'node:assert/strict'
import test from 'node:test'

import { createStyleMemoryGetHandler } from '../../src/app/api/couples/[coupleId]/style-memory/route'

test('createStyleMemoryGetHandler returns aggregated long-term style memory snapshot', async () => {
  const handler = createStyleMemoryGetHandler({
    getStyleMemoryProfileByCoupleId: async coupleId => ({
      preferredStyle: 'poetic',
      preferredTone: 'gentle',
      blockedPhrases: ['命中注定'],
      anchorKeywords: ['晚风', '散步'],
      anchorLocations: ['广州'],
      selectedStyleCounts: [{ style: 'poetic', count: 3 }],
      userEditedCount: 2,
      keptAICount: 1,
      sourceSampleCount: 4,
      summaryLines: ['长期风格优先参考：poetic'],
      coupleId,
    }),
  })

  const response = await handler(new Request('http://localhost/api/couples/couple_1/style-memory'), {
    coupleUser: { coupleId: 'couple_1' },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    profile: {
      preferredStyle: 'poetic',
      preferredTone: 'gentle',
      blockedPhrases: ['命中注定'],
      anchorKeywords: ['晚风', '散步'],
      anchorLocations: ['广州'],
      selectedStyleCounts: [{ style: 'poetic', count: 3 }],
      userEditedCount: 2,
      keptAICount: 1,
      sourceSampleCount: 4,
      summaryLines: ['长期风格优先参考：poetic'],
      coupleId: 'couple_1',
    },
  })
})
