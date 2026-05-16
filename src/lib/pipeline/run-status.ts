type LatestRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEGRADED' | null
type PhotoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

export function resolvePipelineOutcome(input: {
  latestRunStatus: Exclude<LatestRunStatus, 'RUNNING' | null>
  hasDisplayAssets: boolean
}) {
  if (input.latestRunStatus === 'FAILED') {
    return { photoStatus: 'FAILED' as const }
  }

  if (input.latestRunStatus === 'DEGRADED') {
    return { photoStatus: input.hasDisplayAssets ? 'READY' as const : 'FAILED' as const }
  }

  return { photoStatus: input.hasDisplayAssets ? 'READY' as const : 'FAILED' as const }
}

export function buildRetryGuard(input: {
  photoStatus: PhotoStatus
  latestRunStatus: LatestRunStatus
}) {
  if (input.photoStatus === 'PROCESSING' || input.latestRunStatus === 'RUNNING') {
    return {
      allowed: false as const,
      code: 'PIPELINE_ALREADY_RUNNING' as const,
    }
  }

  return { allowed: true as const }
}
