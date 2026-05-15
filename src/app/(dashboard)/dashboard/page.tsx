import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const coupleUser = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id },
    include: {
      couple: {
        include: {
          _count: { select: { albums: true } },
        },
      },
    },
  })

  if (!coupleUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-warm-text mb-3">还没有创建空间</h1>
        <p className="text-warm-muted mb-6">创建一个情侣空间，开始记录你们的故事</p>
        <a
          href="/settings"
          className="px-6 py-3 bg-warm-accent text-white rounded-[var(--radius-md)] font-medium
            hover:bg-warm-accent-hover transition-colors"
        >
          前往设置
        </a>
      </div>
    )
  }

  const couple = coupleUser.couple

  const photoCount = await prisma.photo.count({
    where: { album: { coupleId: couple.id } },
  })

  const milestoneCount = await prisma.milestone.count({
    where: { coupleId: couple.id },
  })

  const daysTogether = couple.startDate
    ? Math.floor((Date.now() - couple.startDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const stats = [
    { label: '照片', value: photoCount, suffix: '张' },
    { label: '相册', value: couple._count.albums, suffix: '个' },
    { label: '里程碑', value: milestoneCount, suffix: '个' },
    ...(daysTogether !== null ? [{ label: '在一起', value: daysTogether, suffix: '天' }] : []),
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-text">
          {couple.name || '我们的空间'}
        </h1>
        <p className="text-warm-muted text-sm mt-1">
          欢迎回来，{session.user.name || ''}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border
              shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <p className="text-warm-muted text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-warm-text mt-1 tracking-tight">
              {stat.value}
              <span className="text-base font-normal text-warm-muted ml-1">
                {stat.suffix}
              </span>
            </p>
          </div>
        ))}
      </div>

      {couple.isPublic && couple.slug && (
        <div className="mt-8 p-5 bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border">
          <p className="text-sm text-warm-muted mb-2">公开链接</p>
          <p className="text-warm-accent font-medium break-all">
            /s/{couple.slug}
          </p>
        </div>
      )}
    </div>
  )
}
