import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAssetUrl, generateAvatarOSSKey } from '../../src/lib/oss'

test('generateAvatarOSSKey stores avatars under user avatar path', () => {
  const ossKey = generateAvatarOSSKey('couple_1', 'user_1', 'portrait.png')

  assert.match(ossKey, /^couples\/couple_1\/avatars\/user_1\/[^/]+\/original\.png$/)
})

test('buildAssetUrl creates public asset url from cdn domain and oss key', () => {
  assert.equal(
    buildAssetUrl('cdn.example.com', 'users/user_1/avatar/file/original.jpg'),
    'https://cdn.example.com/users/user_1/avatar/file/original.jpg'
  )
})
