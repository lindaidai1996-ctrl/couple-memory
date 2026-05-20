import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAvatarUpdatePayload,
  buildBlockedPhrasesDraft,
  buildCoupleUpdatePayload,
  buildPublicPreviewUrl,
  extractApiErrorMessage,
  parseBlockedPhrasesDraft,
} from '../../../src/app/(dashboard)/settings/page'

test('buildAvatarUpdatePayload keeps avatar url when provided', () => {
  assert.deepEqual(
    buildAvatarUpdatePayload('https://cdn.example.com/avatar.jpg'),
    { avatar: 'https://cdn.example.com/avatar.jpg' }
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

test('buildBlockedPhrasesDraft preserves line breaks for textarea editing', () => {
  assert.equal(
    buildBlockedPhrasesDraft(['soulmate', 'meant to be']),
    'soulmate\nmeant to be'
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
