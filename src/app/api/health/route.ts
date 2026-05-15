import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, { status: string; error?: string }> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok' }
  } catch (err: unknown) {
    checks.database = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  const healthy = Object.values(checks).every((c) => c.status === 'ok')

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  )
}
