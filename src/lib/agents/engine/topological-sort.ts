import type { DAGNode } from './types'

export function topologicalSort(nodes: DAGNode[]): DAGNode[][] {
  const inDegree = new Map<string, number>()
  const nodeMap = new Map<string, DAGNode>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    inDegree.set(node.id, node.dependencies.length)
    for (const dep of node.dependencies) {
      const edges = adjacency.get(dep) || []
      edges.push(node.id)
      adjacency.set(dep, edges)
    }
  }

  const levels: DAGNode[][] = []
  let queue = nodes.filter(n => inDegree.get(n.id) === 0)

  while (queue.length > 0) {
    levels.push(queue)
    const nextQueue: DAGNode[] = []
    for (const node of queue) {
      for (const neighbor of adjacency.get(node.id) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          nextQueue.push(nodeMap.get(neighbor)!)
        }
      }
    }
    queue = nextQueue
  }

  return levels
}
