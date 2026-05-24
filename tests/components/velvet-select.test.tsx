import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildVelvetSelectAnchorClassName,
  buildVelvetSelectControlClassName,
  buildVelvetSelectPanelStyle,
} from '../../src/components/forms/velvet-select'

test('VelvetSelect does not force full width by default', () => {
  const className = buildVelvetSelectControlClassName()
  const anchorClassName = buildVelvetSelectAnchorClassName()

  assert.equal(className.includes('w-full'), false)
  assert.equal(className.includes('cm-button--full'), false)
  assert.equal(className.includes('justify-between'), true)
  assert.equal(anchorClassName.includes('inline-block'), true)
  assert.equal(anchorClassName.includes('w-full'), false)
})

test('VelvetSelect can opt into full width when the layout needs it', () => {
  const className = buildVelvetSelectControlClassName({ fullWidth: true })
  const anchorClassName = buildVelvetSelectAnchorClassName({ fullWidth: true })

  assert.equal(className.includes('cm-button--full'), true)
  assert.equal(anchorClassName.includes('w-full'), true)
})

test('VelvetSelect panel can grow beyond trigger width for longer option labels', () => {
  const style = buildVelvetSelectPanelStyle({
    top: 120,
    left: 24,
    width: 180,
  })

  assert.equal(style.position, 'fixed')
  assert.equal(style.width, 'max-content')
  assert.equal(style.minWidth, 180)
  assert.equal(style.maxWidth, 'calc(100vw - 1rem)')
})

test('selected velvet option hover keeps readable selected-state text in light mode', () => {
  const css = readFileSync('src/app/globals.css', 'utf8')

  assert.equal(css.includes('.velvet-select-option-selected:hover'), true)
  assert.equal(css.includes('.velvet-date-day-selected:hover'), true)
  assert.equal(css.includes('color: #fffafc;'), true)
})
