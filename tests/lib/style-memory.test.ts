import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildStyleMemoryProfile,
  buildStyleMemoryPromptLines,
} from '../../src/lib/style-memory'

test('buildStyleMemoryProfile aggregates long-term style signals from saved history', () => {
  const profile = buildStyleMemoryProfile({
    captionStylePreference: null,
    tonePreference: 'gentle',
    blockedPhrases: ['命中注定'],
    samples: [
      {
        locationName: '广州',
        aiKeywords: ['海边', '晚风', '散步'],
        selectedVariantStyle: 'poetic',
        selectedCaptionSource: 'AI',
      },
      {
        locationName: '广州',
        aiKeywords: ['晚风', '路灯'],
        selectedVariantStyle: 'poetic',
        selectedCaptionSource: 'USER',
      },
      {
        locationName: '深圳',
        aiKeywords: ['散步', '夜色'],
        selectedVariantStyle: 'diary',
        selectedCaptionSource: 'USER',
      },
    ],
  })

  assert.equal(profile.preferredStyle, 'poetic')
  assert.equal(profile.preferredTone, 'gentle')
  assert.deepEqual(profile.anchorKeywords, ['晚风', '散步', '海边'])
  assert.deepEqual(profile.anchorLocations, ['广州', '深圳'])
  assert.equal(profile.userEditedCount, 2)
  assert.equal(profile.keptAICount, 1)
  assert.equal(profile.summaryLines[0], '长期风格优先参考：poetic')
})

test('buildStyleMemoryPromptLines keeps stable long-term memory hints concise', () => {
  const lines = buildStyleMemoryPromptLines({
    preferredStyle: 'poetic',
    preferredTone: 'warm',
    blockedPhrases: ['命中注定'],
    anchorKeywords: ['晚风', '散步'],
    anchorLocations: ['广州'],
    selectedStyleCounts: [
      { style: 'poetic', count: 3 },
      { style: 'diary', count: 1 },
    ],
    userEditedCount: 2,
    keptAICount: 1,
    sourceSampleCount: 4,
    summaryLines: [],
  })

  assert.deepEqual(lines, [
    '长期风格优先参考：poetic',
    '长期语气延续：warm',
    '长期保留的意象：晚风、散步',
    '长期重复出现的地点：广州',
    '长期避用表达：命中注定',
  ])
})
