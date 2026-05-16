import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAvatarUpdatePayload,
  buildCoupleUpdatePayload,
  buildPublicPreviewUrl,
  extractApiErrorMessage,
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
