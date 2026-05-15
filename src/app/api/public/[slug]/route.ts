import { NextResponse } from 'next/server'
import { withPublicAccess } from '@/lib/api-middleware'

export const GET = withPublicAccess(async (_req, { couple }) => {
  const daysTogether = couple.startDate
    ? Math.floor(
        (Date.now() - couple.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  return NextResponse.json({
    name: couple.name,
    slug: couple.slug,
    startDate: couple.startDate,
    coverPhotoUrl: couple.coverPhotoUrl,
    bio: couple.bio,
    theme: couple.theme,
    daysTogether,
  })
})
