export interface Agent {
  id: string
  execute(input: PipelineInput, depOutputs: Record<string, unknown>): Promise<AgentOutput>
}

export interface DAGNode {
  id: string
  agent: Agent
  dependencies: string[]
}

export interface PipelineInput {
  photoId: string
  photoUrl: string
  exif: Record<string, unknown> | null
  width: number
  height: number
  locationName: string | null
  preferences?: {
    captionStylePreference?: string | null
    tonePreference?: string | null
    blockedPhrases?: string[]
  }
}

export interface AgentOutput {
  data: unknown
  tokens: number
  cost: number
}

export interface NodeResult {
  nodeId: string
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED'
  output?: unknown
  error?: string
  duration: number
  tokens: number
  cost: number
  retryCount: number
}

export interface PipelineResult {
  status: 'COMPLETED' | 'FAILED'
  nodeResults: Record<string, NodeResult>
  totalTokens: number
  totalCost: number
  duration: number
}
