import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSignedPutUrl } from '@/lib/oss'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileName, fileType, fileSize } = await req.json()

  if (!fileName || !fileType || !fileSize) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }

  const coupleUser = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id },
  })
  if (!coupleUser) {
    return NextResponse.json({ error: 'No couple space found' }, { status: 400 })
  }

  try {
    const result = generateSignedPutUrl(coupleUser.coupleId, fileName, fileType)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload sign failed'
    console.error('[upload/sign]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
