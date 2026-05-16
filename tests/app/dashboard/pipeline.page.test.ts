import assert from 'node:assert/strict'
import test from 'node:test'

import {
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
