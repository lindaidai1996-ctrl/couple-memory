import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRetryGuard, resolvePipelineOutcome } from '../../src/lib/pipeline/run-status'

test('resolvePipelineOutcome returns FAILED when latest run failed', () => {
  const result = resolvePipelineOutcome({
    latestRunStatus: 'FAILED',
    hasDisplayAssets: true,
  })

  assert.equal(result.photoStatus, 'FAILED')
})

test('buildRetryGuard blocks retry while photo is processing', () => {
  const result = buildRetryGuard({
    photoStatus: 'PROCESSING',
    latestRunStatus: 'RUNNING',
  })

  assert.equal(result.allowed, false)
  assert.equal(result.code, 'PIPELINE_ALREADY_RUNNING')
})
