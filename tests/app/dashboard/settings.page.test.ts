import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  applyCoverPhotoSelection,
  buildAvatarPreviewItem,
  buildInviteActionButtonConfigs,
  buildMemoryPreferenceSummary,
  buildStyleMemoryInsightCards,
  buildResetMemoryPreferencesInput,
  buildSettingsHeroCards,
  buildCoverTileClassName,
  buildRecentCoverPhotoOptions,
  buildProfileUpdatePayload,
  buildBlockedPhrasesDraft,
  buildCoupleUpdatePayload,
  buildMemorySitePreviewUrl,
  buildPublicPreviewUrl,
  resolveDisplayAvatarUrl,
  extractApiErrorMessage,
  normalizeCoverModeForSettings,
  parseBlockedPhrasesDraft,
} from '../../../src/app/(dashboard)/settings/page'

test('buildProfileUpdatePayload trims user name before saving', () => {
  assert.deepEqual(
    buildProfileUpdatePayload('  Lindaidai  '),
    { name: 'Lindaidai' }
  )
})

test('buildProfileUpdatePayload keeps empty name as null when user clears it', () => {
  assert.deepEqual(
    buildProfileUpdatePayload('   '),
    { name: null }
  )
})

test('resolveDisplayAvatarUrl falls back to default avatar when profile avatar is missing', () => {
  assert.equal(
    resolveDisplayAvatarUrl({
      email: 'linda@example.com',
      name: 'Lindaidai',
      avatar: null,
    }),
    '/avatars/default/avatar-03.svg'
  )
})

test('buildAvatarPreviewItem returns a preview target only for uploaded avatars', () => {
  assert.deepEqual(
    buildAvatarPreviewItem({
      email: 'linda@example.com',
      name: 'Lindaidai',
      avatar: 'https://cdn.example.com/avatar.jpg',
    }),
    {
      id: 'avatar',
      src: 'https://cdn.example.com/avatar.jpg',
      alt: 'Lindaidai',
      title: 'Lindaidai',
    }
  )

  assert.equal(
    buildAvatarPreviewItem({
      email: 'linda@example.com',
      name: 'Lindaidai',
      avatar: null,
    }),
    null
  )
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

test('InviteSection keeps invite actions compact in dense action rows', () => {
  assert.deepEqual(
    buildInviteActionButtonConfigs(false, {
      inviteCopied: 'copied',
      inviteCopy: 'copy',
      inviteRegenerate: 'regenerate',
    }),
    {
      copy: {
        label: 'copy',
        size: 'sm',
        variant: 'secondary',
      },
      regenerate: {
        label: 'regenerate',
        size: 'sm',
        variant: 'ghost',
      },
    }
  )
})

test('cover photo tiles opt into full-width media button layout', () => {
  const className = buildCoverTileClassName(false)

  assert.match(className, /\bcm-media-tile\b/)
  assert.doesNotMatch(className, /\bcm-button\b/)
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

test('settings page gates memory preference reset behind a confirmation modal', () => {
  const source = readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8')

  assert.equal(source.includes('const [showResetMemoryPreferencesConfirm, setShowResetMemoryPreferencesConfirm] = useState(false)'), true)
  assert.equal(source.includes("onClick={() => setShowResetMemoryPreferencesConfirm(true)}"), true)
  assert.equal(source.includes("title={t('memoryPreferenceResetConfirmTitle')}"), true)
  assert.equal(source.includes("description={t('memoryPreferenceResetConfirmDescription')}"), true)
  assert.equal(source.includes("confirmText={t('memoryPreferenceResetConfirmAction')}"), true)
  assert.equal(source.includes("setShowResetMemoryPreferencesConfirm(false)\n          void handleResetMemoryPreferences()"), true)
})

test('settings page uses inline edit controls and immediate saves instead of one page-level save button', () => {
  const source = readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8')

  assert.equal(source.includes('const [editingTextField, setEditingTextField] = useState<EditableTextFieldKey | null>(null)'), true)
  assert.equal(source.includes('async function handleImmediateCoupleSave('), true)
  assert.equal(source.includes("editingTextField === 'slug'"), true)
  assert.equal(source.includes("editingTextField === 'blockedPhrases'"), true)
  assert.equal(source.includes("onChange={value => void handleImmediateCoupleSave("), true)
  assert.equal(source.includes("type=\"submit\"\n          loading={saving}\n          variant=\"brand\""), false)
  assert.equal(source.includes('<form onSubmit={handleSubmit} className=\"space-y-4\">'), false)
})

test('settings page read-only text fields keep content vertically centered', () => {
  const source = readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8')

  assert.equal(source.includes("const readOnlyControlClass = `${controlClass} flex items-center bg-[var(--dashboard-surface-gradient)] text-[var(--text-soft)]`"), true)
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
    'https://example.com/story/our-space'
  )
})

test('buildMemorySitePreviewUrl creates memory-site preview link from origin and slug', () => {
  assert.equal(
    buildMemorySitePreviewUrl('https://example.com/', 'our-space'),
    'https://example.com/story/our-space/site'
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
        detail: 'Slug /story/our-space is available for sharing.',
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
