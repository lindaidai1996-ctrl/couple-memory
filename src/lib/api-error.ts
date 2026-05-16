import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    retryable: boolean
    requestId?: string
  }
}

export function createApiErrorResponse(
  status: number,
  code: string,
  message: string,
  retryable = false,
  requestId?: string
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        retryable,
        ...(requestId ? { requestId } : {}),
      },
    },
    { status }
  )
}

export function createRequestId() {
  return randomUUID()
}

export function logApiError(
  tag: string,
  message: string,
  meta: Record<string, unknown>
) {
  logger.error(tag, message, meta)
}
