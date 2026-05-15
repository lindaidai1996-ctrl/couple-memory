import type { DAGNode, PipelineInput, NodeResult, PipelineResult } from './types'
import { topologicalSort } from './topological-sort'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )
  return Promise.race([promise, timeout])
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number
): Promise<{ result: T; retryCount: number }> {
  let retryCount = 0
  while (true) {
    try {
      const result = await fn()
      return { result, retryCount }
    } catch (err) {
      if (retryCount >= maxRetries) throw err
      retryCount++
      await new Promise(r => setTimeout(r, 1000 * retryCount))
    }
  }
}

async function executeNode(
  node: DAGNode,
  results: Map<string, NodeResult>,
  input: PipelineInput
): Promise<NodeResult> {
  for (const depId of node.dependencies) {
    if (results.get(depId)?.status !== 'COMPLETED') {
      return {
        nodeId: node.id, status: 'SKIPPED',
        duration: 0, tokens: 0, cost: 0, retryCount: 0,
      }
    }
  }

  const depOutputs: Record<string, unknown> = {}
  for (const depId of node.dependencies) {
    depOutputs[depId] = results.get(depId)?.output
  }

  const start = Date.now()
  try {
    const { result, retryCount } = await withRetry(
      () => withTimeout(node.agent.execute(input, depOutputs), 30_000),
      2
    )
    return {
      nodeId: node.id,
      status: 'COMPLETED',
      output: result.data,
      duration: Date.now() - start,
      tokens: result.tokens,
      cost: result.cost,
      retryCount,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      nodeId: node.id,
      status: 'FAILED',
      error: message,
      duration: Date.now() - start,
      tokens: 0, cost: 0, retryCount: 2,
    }
  }
}

export async function executePipeline(
  nodes: DAGNode[],
  input: PipelineInput
): Promise<PipelineResult> {
  const levels = topologicalSort(nodes)
  const results = new Map<string, NodeResult>()
  const start = Date.now()

  for (const level of levels) {
    const levelResults = await Promise.all(
      level.map(node => executeNode(node, results, input))
    )
    for (const r of levelResults) {
      results.set(r.nodeId, r)
    }
  }

  const allResults = Object.fromEntries(results)
  const hasFailed = [...results.values()].some(r => r.status === 'FAILED')

  return {
    status: hasFailed ? 'FAILED' : 'COMPLETED',
    nodeResults: allResults,
    totalTokens: [...results.values()].reduce((s, r) => s + r.tokens, 0),
    totalCost: [...results.values()].reduce((s, r) => s + r.cost, 0),
    duration: Date.now() - start,
  }
}
