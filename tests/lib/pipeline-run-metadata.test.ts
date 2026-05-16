import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPipelineRunUpdate } from '../../src/lib/agents/pipeline'

test('buildPipelineRunUpdate marks mixed node outcomes as DEGRADED and preserves retry metadata', () => {
  const update = buildPipelineRunUpdate({
    result: {
      status: 'FAILED',
      nodeResults: {
        photoAnalyzer: {
          nodeId: 'photoAnalyzer',
          status: 'COMPLETED',
          output: { scene: 'park' },
          duration: 30,
          tokens: 100,
          cost: 0.01,
          retryCount: 0,
        },
        captionWriter: {
          nodeId: 'captionWriter',
          status: 'FAILED',
          error: 'timeout',
          duration: 31,
          tokens: 0,
          cost: 0,
          retryCount: 2,
        },
      },
      totalTokens: 100,
      totalCost: 0.01,
      duration: 61,
    },
    triggerType: 'RETRY',
    attemptNumber: 3,
  })

  assert.equal(update.status, 'DEGRADED')
  assert.equal(update.triggerType, 'RETRY')
  assert.equal(update.attemptNumber, 3)
  assert.equal(update.errorCode, 'CAPTIONWRITER_FAILED')
  assert.equal(update.summary, 'captionWriter failed: timeout')
})

test('buildPipelineRunUpdate keeps fully failed runs as FAILED', () => {
  const update = buildPipelineRunUpdate({
    result: {
      status: 'FAILED',
      nodeResults: {
        photoAnalyzer: {
          nodeId: 'photoAnalyzer',
          status: 'FAILED',
          error: 'vision timeout',
          duration: 30,
          tokens: 0,
          cost: 0,
          retryCount: 2,
        },
        captionWriter: {
          nodeId: 'captionWriter',
          status: 'SKIPPED',
          duration: 0,
          tokens: 0,
          cost: 0,
          retryCount: 0,
        },
      },
      totalTokens: 0,
      totalCost: 0,
      duration: 30,
    },
  })

  assert.equal(update.status, 'FAILED')
  assert.equal(update.attemptNumber, 1)
  assert.equal(update.triggerType, 'UPLOAD')
  assert.equal(update.errorCode, 'PHOTOANALYZER_FAILED')
  assert.equal(update.summary, 'photoAnalyzer failed: vision timeout')
})
