import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { Button, buttonClassName } from '../../src/components/ui/button'

test('buttonClassName returns velvet semantic classes with requested size', () => {
  const className = buttonClassName({
    scheme: 'velvet',
    variant: 'danger',
    size: 'sm',
  })

  assert.match(className, /\bcm-button\b/)
  assert.match(className, /\bcm-button--velvet\b/)
  assert.match(className, /\bcm-button--danger\b/)
  assert.match(className, /\bcm-button--sm\b/)
})

test('buttonClassName returns film classes and honors full width links', () => {
  const className = buttonClassName({
    scheme: 'film',
    variant: 'secondary',
    size: 'lg',
    fullWidth: true,
    className: 'justify-between',
  })

  assert.match(className, /\bcm-button--film\b/)
  assert.match(className, /\bcm-button--secondary\b/)
  assert.match(className, /\bcm-button--lg\b/)
  assert.match(className, /\bcm-button--full\b/)
  assert.match(className, /\bjustify-between\b/)
})

test('Button renders loading state with spinner and disabled attributes', () => {
  const markup = renderToStaticMarkup(
    <Button loading variant="brand">
      保存中
    </Button>
  )

  assert.match(markup, /aria-busy="true"/)
  assert.match(markup, /disabled=""/)
  assert.match(markup, /cm-button__spinner/)
  assert.match(markup, /保存中/)
})

test('Button renders icon slots around label content', () => {
  const markup = renderToStaticMarkup(
    <Button
      variant="secondary"
      leadingIcon={<span data-slot="leading">L</span>}
      trailingIcon={<span data-slot="trailing">T</span>}
    >
      查看详情
    </Button>
  )

  assert.match(markup, /data-slot="leading"/)
  assert.match(markup, /data-slot="trailing"/)
  assert.match(markup, /cm-button__label/)
  assert.match(markup, /查看详情/)
})
