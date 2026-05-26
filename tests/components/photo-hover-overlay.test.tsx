import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  PhotoHoverOverlay,
  buildPhotoHoverActionButtonClassName,
  buildPhotoHoverIndicatorClassName,
  buildPhotoHoverOverlayClassName,
  buildPhotoHoverMaskClassName,
} from '../../src/components/photo-hover-overlay'

test('photo hover overlay exposes separate top and bottom gradient masks', () => {
  assert.match(buildPhotoHoverOverlayClassName(), /\bcm-photo-hover-overlay\b/)
  assert.equal(buildPhotoHoverOverlayClassName().includes('rounded-['), false)
  assert.match(buildPhotoHoverMaskClassName('top'), /\bcm-photo-hover-mask--top\b/)
  assert.equal(buildPhotoHoverMaskClassName('top').includes('bg-gradient-to-b'), true)
  assert.match(buildPhotoHoverMaskClassName('bottom'), /\bcm-photo-hover-mask--bottom\b/)
  assert.equal(buildPhotoHoverMaskClassName('bottom').includes('bg-gradient-to-t'), true)
})

test('photo hover overlay action button keeps hover actions clickable above the masks', () => {
  const className = buildPhotoHoverActionButtonClassName()

  assert.match(className, /\bcm-photo-hover-action\b/)
  assert.equal(className.includes('pointer-events-auto'), true)
  assert.equal(className.includes('backdrop-blur'), false)
  assert.equal(className.includes('rounded-['), false)
  assert.equal(className.includes('bg-['), false)
  assert.equal(className.includes('border '), false)
  assert.equal(className.includes('cursor-pointer'), true)
})

test('photo hover overlay current cover indicator stays non-interactive', () => {
  const className = buildPhotoHoverIndicatorClassName()

  assert.match(className, /\bcm-photo-hover-indicator\b/)
  assert.equal(className.includes('pointer-events-none'), true)
  assert.equal(className.includes('cursor-pointer'), false)
  assert.equal(className.includes('cursor-wait'), false)
})

test('PhotoHoverOverlay renders top and bottom slots for future extensibility', () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhotoHoverOverlay, {
      topSlot: React.createElement('span', null, 'top'),
      bottomSlot: React.createElement('button', { type: 'button' }, '删除照片'),
    })
  )

  assert.match(markup, /cm-photo-hover-overlay/)
  assert.match(markup, /cm-photo-hover-mask--top/)
  assert.match(markup, /cm-photo-hover-mask--bottom/)
  assert.equal(markup.includes('>top<'), true)
  assert.equal(markup.includes('>删除照片<'), true)
})
