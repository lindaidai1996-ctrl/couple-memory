import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getDefaultAvatarPath,
  resolveUserAvatarUrl,
} from '../../src/lib/default-avatar'

test('getDefaultAvatarPath chooses a stable built-in avatar from seed text', () => {
  assert.equal(
    getDefaultAvatarPath('linda@example.com'),
    '/avatars/default/avatar-03.svg'
  )
})

test('resolveUserAvatarUrl prefers uploaded avatar over built-in default', () => {
  assert.equal(
    resolveUserAvatarUrl({
      avatar: 'https://cdn.example.com/avatar.jpg',
      email: 'linda@example.com',
      name: 'Lindaidai',
    }),
    'https://cdn.example.com/avatar.jpg'
  )
})

test('resolveUserAvatarUrl falls back to built-in avatar when current avatar is empty', () => {
  assert.equal(
    resolveUserAvatarUrl({
      avatar: null,
      email: 'linda@example.com',
      name: 'Lindaidai',
    }),
    '/avatars/default/avatar-03.svg'
  )
})
