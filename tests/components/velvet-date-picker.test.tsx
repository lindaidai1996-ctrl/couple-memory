import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildVelvetDatePickerAnchorClassName,
  buildVelvetDatePickerControlClassName,
} from '../../src/components/forms/velvet-date-picker'

test('VelvetDatePicker does not force full width by default', () => {
  const className = buildVelvetDatePickerControlClassName()
  const anchorClassName = buildVelvetDatePickerAnchorClassName()

  assert.equal(className.includes('w-full'), false)
  assert.equal(className.includes('cm-button--full'), false)
  assert.equal(className.includes('justify-between'), true)
  assert.equal(anchorClassName.includes('inline-block'), true)
  assert.equal(anchorClassName.includes('w-full'), false)
})

test('VelvetDatePicker can opt into full width when the layout needs it', () => {
  const className = buildVelvetDatePickerControlClassName({ fullWidth: true })
  const anchorClassName = buildVelvetDatePickerAnchorClassName({ fullWidth: true })

  assert.equal(className.includes('cm-button--full'), true)
  assert.equal(anchorClassName.includes('w-full'), true)
})
