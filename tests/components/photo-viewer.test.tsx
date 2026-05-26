import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  PhotoViewer,
  buildPhotoViewerCopy,
  buildPhotoViewerNavigationState,
  buildPhotoViewerToolbarActions,
  buildPhotoViewerTransform,
} from '../../src/components/photo-viewer'

test('buildPhotoViewerNavigationState exposes previous and next indices within bounds', () => {
  assert.deepEqual(
    buildPhotoViewerNavigationState({ currentIndex: 1, total: 3 }),
    {
      hasPrevious: true,
      hasNext: true,
      previousIndex: 0,
      nextIndex: 2,
    }
  )

  assert.deepEqual(
    buildPhotoViewerNavigationState({ currentIndex: 0, total: 1 }),
    {
      hasPrevious: false,
      hasNext: false,
      previousIndex: null,
      nextIndex: null,
    }
  )
})

test('buildPhotoViewerTransform clamps zoom and supports bidirectional rotation actions', () => {
  assert.deepEqual(
    buildPhotoViewerTransform({ scale: 1, rotation: 0 }, 'zoom-out'),
    { scale: 1, rotation: 0 }
  )

  assert.deepEqual(
    buildPhotoViewerTransform({ scale: 3.75, rotation: 0 }, 'zoom-in'),
    { scale: 4, rotation: 0 }
  )

  assert.deepEqual(
    buildPhotoViewerTransform({ scale: 2, rotation: 0 }, 'rotate-right'),
    { scale: 2, rotation: 90 }
  )

  assert.deepEqual(
    buildPhotoViewerTransform({ scale: 2, rotation: 0 }, 'rotate-left'),
    { scale: 2, rotation: -90 }
  )

})

test('buildPhotoViewerToolbarActions keeps common actions before custom actions', () => {
  const copy = buildPhotoViewerCopy(key => key)
  const actions = buildPhotoViewerToolbarActions({
    copy,
    customActions: [
      {
        key: 'delete',
        label: 'deletePhoto',
        icon: React.createElement('span', null, 'D'),
        onSelect: () => {},
      },
    ],
  })

  assert.deepEqual(actions.map(action => action.key), [
    'zoom-out',
    'zoom-in',
    'rotate-left',
    'rotate-right',
    'delete',
  ])
})

test('PhotoViewer renders toolbar actions, loading hooks, and custom action slots', () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhotoViewer, {
      open: true,
      items: [
        {
          id: 'photo-1',
          src: 'https://cdn.example.com/photo-1.jpg',
          alt: 'photo 1',
          title: 'First photo',
        },
      ],
      currentIndex: 0,
      onIndexChange: () => {},
      onClose: () => {},
      copy: buildPhotoViewerCopy(key => key),
      customActions: [
        {
          key: 'delete',
          label: 'deletePhoto',
          icon: React.createElement('span', null, 'D'),
          onSelect: () => {},
        },
      ],
    })
  )

  assert.match(markup, /cm-photo-viewer/)
  assert.match(markup, /cm-photo-viewer__loading/)
  assert.match(markup, /aria-label="zoomOut"/)
  assert.match(markup, /aria-label="zoomIn"/)
  assert.match(markup, /aria-label="rotateLeft"/)
  assert.match(markup, /aria-label="rotateRight"/)
  assert.match(markup, /aria-label="deletePhoto"/)
})
