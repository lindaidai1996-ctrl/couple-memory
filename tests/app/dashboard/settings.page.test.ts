import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyCoverPhotoSelection,
  buildAvatarInputInitialValue,
  buildMemoryPreferenceSummary,
  buildStyleMemoryInsightCards,
  buildResetMemoryPreferencesInput,
  buildSettingsHeroCards,
  buildRecentCoverPhotoOptions,
  buildAvatarUpdatePayload,
  buildBlockedPhrasesDraft,
  buildCoupleUpdatePayload,
  buildPublicPreviewUrl,
  extractApiErrorMessage,
  normalizeCoverModeForSettings,
  parseBlockedPhrasesDraft,
} from '../../../src/app/(dashboard)/settings/page'

test('buildAvatarUpdatePayload keeps avatar url when provided', () => {
  assert.deepEqual(
    buildAvatarUpdatePayload('https://cdn.example.com/avatar.jpg'),
    { avatar: 'https://cdn.example.com/avatar.jpg' }
  )
})

test('buildAvatarUpdatePayload clears avatar when input is blank', () => {
  assert.deepEqual(
    buildAvatarUpdatePayload('   '),
    { avatar: null }
  )
})

test('buildAvatarInputInitialValue keeps manual avatar url field blank by default', () => {
  assert.equal(buildAvatarInputInitialValue(), '')
})

test('buildCoupleUpdatePayload clears manual cover fields in NONE mode', () => {
  assert.deepEqual(
    buildCoupleUpdatePayload({
      name: 'Our Space',
      slug: 'our-space',
      startDate: '2026-05-01',
      bio: 'hello',
      isPublic: true,
      coverMode: 'NONE',
      coverPhotoId: 'photo-9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    }),
    {
      name: 'Our Space',
      slug: 'our-space',
      startDate: '2026-05-01',
      bio: 'hello',
      isPublic: true,
      coverMode: 'NONE',
      coverPhotoId: null,
      coverPhotoUrl: null,
    }
  )
})

test('buildCoupleUpdatePayload clears photo id when cover mode is UPLOAD', () => {
  assert.deepEqual(
    buildCoupleUpdatePayload({
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: false,
      coverMode: 'UPLOAD',
      coverPhotoId: 'photo-9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    }),
    {
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: false,
      coverMode: 'UPLOAD',
      coverPhotoId: null,
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    }
  )
})

test('buildCoupleUpdatePayload omits invalid AI preference updates instead of clearing saved values', () => {
  assert.deepEqual(
    buildCoupleUpdatePayload({
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: false,
      coverMode: 'PHOTO',
      coverPhotoId: 'photo-9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      captionStylePreference: 'playful',
      tonePreference: 'dramatic',
      blockedPhrases: ['keep', 42] as unknown as string[],
    }),
    {
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: false,
      coverMode: 'PHOTO',
      coverPhotoId: 'photo-9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
    }
  )
})

test('buildCoupleUpdatePayload preserves explicit AI preference clears and valid blocked phrase updates', () => {
  assert.deepEqual(
    buildCoupleUpdatePayload({
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: true,
      coverMode: 'PHOTO',
      coverPhotoId: ' photo-9 ',
      coverPhotoUrl: ' https://cdn.example.com/cover.jpg ',
      captionStylePreference: '   ',
      tonePreference: null,
      blockedPhrases: [' soulmate ', '', 'meant to be'],
    }),
    {
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: true,
      coverMode: 'PHOTO',
      coverPhotoId: 'photo-9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      captionStylePreference: null,
      tonePreference: null,
      blockedPhrases: ['soulmate', 'meant to be'],
    }
  )
})

test('normalizeCoverModeForSettings folds legacy upload mode into current settings options', () => {
  assert.equal(normalizeCoverModeForSettings('UPLOAD', 'https://cdn.example.com/cover.jpg'), 'PHOTO')
  assert.equal(normalizeCoverModeForSettings('UPLOAD', null), 'NONE')
})

test('buildRecentCoverPhotoOptions keeps the newest cover-ready photos first', () => {
  assert.deepEqual(
    buildRecentCoverPhotoOptions([
      {
        id: 'photo_old_ready',
        fileName: 'old-ready.jpg',
        status: 'READY',
        sortOrder: 1,
        createdAt: '2026-05-01T00:00:00.000Z',
        thumbnailUrl: 'https://cdn.example.com/old-thumb.jpg',
        displayUrl: 'https://cdn.example.com/old.jpg',
      },
      {
        id: 'photo_processing',
        fileName: 'processing.jpg',
        status: 'PROCESSING',
        sortOrder: 99,
        createdAt: '2026-05-20T00:00:00.000Z',
        thumbnailUrl: 'https://cdn.example.com/processing-thumb.jpg',
        displayUrl: null,
      },
      {
        id: 'photo_new_ready',
        fileName: 'new-ready.jpg',
        status: 'READY',
        sortOrder: 5,
        createdAt: '2026-05-10T00:00:00.000Z',
        thumbnailUrl: null,
        displayUrl: 'https://cdn.example.com/new.jpg',
      },
    ], 2),
    [
      {
        id: 'photo_new_ready',
        fileName: 'new-ready.jpg',
        previewUrl: 'https://cdn.example.com/new.jpg',
        coverUrl: 'https://cdn.example.com/new.jpg',
      },
      {
        id: 'photo_old_ready',
        fileName: 'old-ready.jpg',
        previewUrl: 'https://cdn.example.com/old-thumb.jpg',
        coverUrl: 'https://cdn.example.com/old.jpg',
      },
    ]
  )
})

test('applyCoverPhotoSelection updates both photo id and preview url', () => {
  assert.deepEqual(
    applyCoverPhotoSelection(
      {
        id: 'couple_1',
        name: 'Our Space',
        slug: 'our-space',
        startDate: null,
        bio: null,
        isPublic: true,
        coverMode: 'PHOTO',
        coverPhotoId: null,
        coverPhotoUrl: null,
        captionStylePreference: null,
        tonePreference: null,
        blockedPhrases: [],
        inviteCode: null,
        inviteExpiresAt: null,
      },
      {
        id: 'photo_9',
        fileName: 'cover.jpg',
        previewUrl: 'https://cdn.example.com/cover-thumb.jpg',
        coverUrl: 'https://cdn.example.com/cover.jpg',
      }
    ),
    {
      id: 'couple_1',
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: true,
      coverMode: 'PHOTO',
      coverPhotoId: 'photo_9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      captionStylePreference: null,
      tonePreference: null,
      blockedPhrases: [],
      inviteCode: null,
      inviteExpiresAt: null,
    }
  )
})

test('buildBlockedPhrasesDraft preserves line breaks for textarea editing', () => {
  assert.equal(
    buildBlockedPhrasesDraft(['soulmate', 'meant to be']),
    'soulmate\nmeant to be'
  )
})

test('buildMemoryPreferenceSummary exposes current AI memory settings at a glance', () => {
  assert.deepEqual(
    buildMemoryPreferenceSummary({
      captionStylePreference: 'memoir',
      tonePreference: null,
      blockedPhrases: ['soulmate', 'meant to be'],
    }),
    {
      styleLabel: 'memoir',
      toneLabel: 'default',
      blockedCount: 2,
      hasCustomPreferences: true,
    }
  )
})

test('buildResetMemoryPreferencesInput clears stored AI memory preferences', () => {
  assert.deepEqual(
    buildResetMemoryPreferencesInput({
      id: 'couple_1',
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: true,
      coverMode: 'PHOTO',
      coverPhotoId: 'photo_9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      captionStylePreference: 'memoir',
      tonePreference: 'witty',
      blockedPhrases: ['soulmate'],
      inviteCode: null,
      inviteExpiresAt: null,
    }),
    {
      id: 'couple_1',
      name: 'Our Space',
      slug: 'our-space',
      startDate: null,
      bio: null,
      isPublic: true,
      coverMode: 'PHOTO',
      coverPhotoId: 'photo_9',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      captionStylePreference: null,
      tonePreference: null,
      blockedPhrases: [],
      inviteCode: null,
      inviteExpiresAt: null,
    }
  )
})

test('buildStyleMemoryInsightCards exposes long-term memory hints for settings surfaces', () => {
  assert.deepEqual(
    buildStyleMemoryInsightCards({
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
    }),
    [
      { id: 'style', value: 'poetic' },
      { id: 'tone', value: 'gentle' },
      { id: 'keywords', value: '晚风、散步' },
      { id: 'locations', value: '广州' },
      { id: 'edits', value: '2 / 4' },
    ]
  )
})

test('parseBlockedPhrasesDraft normalizes textarea input only when syncing', () => {
  assert.deepEqual(
    parseBlockedPhrasesDraft(' soulmate \n\nmeant to be\n'),
    ['soulmate', 'meant to be']
  )
})

test('buildPublicPreviewUrl creates public preview link from origin and slug', () => {
  assert.equal(
    buildPublicPreviewUrl('https://example.com', 'our-space'),
    'https://example.com/s/our-space'
  )
})

test('extractApiErrorMessage prefers unified error envelope message', () => {
  assert.equal(
    extractApiErrorMessage(
      {
        error: {
          code: 'SLUG_ALREADY_TAKEN',
          message: 'Slug already taken',
          retryable: false,
        },
      },
      '保存失败'
    ),
    'Slug already taken'
  )
})

test('buildSettingsHeroCards summarizes publication, cover, and ai preferences', () => {
  assert.deepEqual(
    buildSettingsHeroCards({
      isPublic: true,
      slug: 'our-space',
      coverMode: 'PHOTO',
      coverPhotoUrl: 'https://cdn.example.com/cover.jpg',
      avatar: 'https://cdn.example.com/avatar.jpg',
      captionStylePreference: 'memoir',
      tonePreference: null,
      blockedPhrases: ['soulmate', 'meant to be'],
    }),
    [
      {
        label: 'Publication',
        value: 'Live',
        detail: 'Slug /s/our-space is available for sharing.',
      },
      {
        label: 'Visual Mood',
        value: 'Curated',
        detail: 'Avatar, cover, and tone controls already have visible material.',
      },
      {
        label: 'AI Guardrails',
        value: '2 filters',
        detail: 'Caption style memoir with 2 blocked phrases.',
      },
    ]
  )
})
