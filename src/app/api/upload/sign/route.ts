import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSTSCredentials } from '@/lib/oss'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB（压缩前原图上限）
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

  const result = await getSTSCredentials(coupleUser.coupleId, fileName)
  return NextResponse.json(result)
}
