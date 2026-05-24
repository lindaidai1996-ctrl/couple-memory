import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildPipelineDetailPanelClassName,
  buildPipelineRunMetaClassName,
  buildPipelineRunRowClassName,
  buildPipelineRunTitleClassName,
  buildPipelineStatusOptions,
  buildPipelineUiText,
} from '../../../src/app/(dashboard)/pipeline/page'

test('buildPipelineStatusOptions uses translator labels', () => {
  const t = (key: string) =>
    ({
      allStatuses: 'All statuses',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      degraded: 'Completed with fallback',
    })[key] ?? key

  assert.deepEqual(buildPipelineStatusOptions(t), [
    { label: 'All statuses', value: '' },
    { label: 'Running', value: 'RUNNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Completed with fallback', value: 'DEGRADED' },
  ])
})

test('buildPipelineUiText returns translated headings', () => {
  const t = (key: string) =>
    ({
      title: 'Pipeline run history',
      subtitle: 'Inspect the status and node results for each photo processing run',
      recentRuns: 'Recent runs',
      runDetail: 'Run detail',
    })[key] ?? key

  assert.deepEqual(buildPipelineUiText(t), {
    title: 'Pipeline run history',
    subtitle: 'Inspect the status and node results for each photo processing run',
    recentRuns: 'Recent runs',
    runDetail: 'Run detail',
  })
})

test('pipeline page uses VelvetSelect for status filtering', () => {
  const source = readFileSync('src/app/(dashboard)/pipeline/page.tsx', 'utf8')

  assert.equal(source.includes("import { VelvetSelect } from '@/components/forms/velvet-select'"), true)
  assert.equal(source.includes('<VelvetSelect'), true)
  assert.equal(source.includes('<select'), false)
})

test('pipeline run rows use elevated card styling instead of flat divider rows', () => {
  const idleClassName = buildPipelineRunRowClassName(false)
  const activeClassName = buildPipelineRunRowClassName(true)

  assert.equal(idleClassName.includes('rounded-[22px]'), true)
  assert.equal(idleClassName.includes('border-[var(--color-warm-border)]'), true)
  assert.equal(idleClassName.includes('cm-button'), false)
  assert.equal(idleClassName.includes('cursor-pointer'), true)
  assert.equal(idleClassName.includes('bg-[var(--panel-strong)]/55'), true)
  assert.equal(idleClassName.includes('shadow-[0_10px_24px_rgba(40,24,34,0.08)]'), true)
  assert.equal(activeClassName.includes('velvet-active-surface'), true)
  assert.equal(activeClassName.includes('shadow-[0_14px_30px_rgba(90,54,77,0.18)]'), true)
})

test('pipeline run rows render as div cards instead of buttons', () => {
  const source = readFileSync('src/app/(dashboard)/pipeline/page.tsx', 'utf8')

  assert.equal(source.includes('<button'), false)
  assert.equal(source.includes('<div'), true)
  assert.equal(source.includes('key={run.id}'), true)
})

test('pipeline selected run uses brighter text in light mode', () => {
  const selectedTitleClassName = buildPipelineRunTitleClassName(true)
  const selectedMetaClassName = buildPipelineRunMetaClassName(true)

  assert.equal(selectedTitleClassName.includes('text-[#fffafc]'), true)
  assert.equal(selectedMetaClassName.includes('text-white/82'), true)
})

test('pipeline node results pre uses slim scrollbar class', () => {
  const source = readFileSync('src/app/(dashboard)/pipeline/page.tsx', 'utf8')
  const css = readFileSync('src/app/globals.css', 'utf8')

  assert.equal(source.includes('pipeline-node-results-scroll'), true)
  assert.equal(css.includes('.pipeline-node-results-scroll::-webkit-scrollbar'), true)
  assert.equal(css.includes('height: 6px;'), true)
})

test('pipeline detail panel keeps a stable minimum height to avoid page scrollbar jitter', () => {
  const className = buildPipelineDetailPanelClassName()

  assert.equal(className.includes('min-h-[42rem]'), true)
  assert.equal(className.includes('overflow-y-auto'), true)
})
