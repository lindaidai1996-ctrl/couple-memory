import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReadinessCard } from '@/components/readiness-card'
import {
  buildOrganizationReadiness,
  type OrganizationReadinessAction,
} from '@/lib/readiness/organization-readiness'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export function buildDashboardCoupleUserQuery(userId: string) {
  return {
    where: { userId },
    select: {
      couple: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPublic: true,
          startDate: true,
          _count: { select: { albums: true } },
        },
      },
    },
  } as const
}

export function buildDashboardReadinessCard({
  score,
  suggestions,
  actions,
}: {
  score: number
  suggestions: string[]
  actions: OrganizationReadinessAction[]
}) {
  return {
    score,
    hasSuggestions: suggestions.length > 0,
    suggestionCount: suggestions.length,
    hasActions: actions.length > 0,
    actionCount: actions.length,
  }
}

export default async function DashboardPage() {
  const t = await getTranslations('DashboardPage')
  const session = await auth()
  if (!session) redirect('/login')

  const coupleUser = await prisma.coupleUser.findFirst(
    buildDashboardCoupleUserQuery(session.user.id)
  )

  if (!coupleUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-warm-text mb-3">{t('emptyTitle')}</h1>
        <p className="text-warm-muted mb-6">{t('emptySubtitle')}</p>
        <a
          href="/settings"
          className="px-6 py-3 bg-warm-accent text-white rounded-[var(--radius-md)] font-medium
            hover:bg-warm-accent-hover transition-colors"
        >
          {t('goToSettings')}
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
  const chapterCount = await prisma.albumChapter.count({
    where: { album: { coupleId: couple.id } },
  })
  const chapterPhotoCount = await prisma.photo.count({
    where: { album: { coupleId: couple.id }, chapterId: { not: null } },
  })

  const now = new Date()
  const daysTogether = couple.startDate
    ? Math.floor((now.getTime() - couple.startDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const stats = [
    { label: t('photos'), value: photoCount, suffix: t('photoSuffix') },
    { label: t('albums'), value: couple._count.albums, suffix: t('albumSuffix') },
    { label: '章节', value: chapterCount, suffix: '个' },
    { label: t('milestones'), value: milestoneCount, suffix: t('milestoneSuffix') },
    ...(daysTogether !== null ? [{ label: t('daysTogether'), value: daysTogether, suffix: t('daySuffix') }] : []),
  ]
  const readiness = buildOrganizationReadiness({
    totalPhotos: photoCount,
    chapterPhotoCount,
    chapterCount,
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-text">
          {couple.name || t('spaceNameFallback')}
        </h1>
        <p className="text-warm-muted text-sm mt-1">
          {t('welcomeBack', { name: session.user.name || '' })}
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
          <p className="text-sm text-warm-muted mb-2">{t('publicLink')}</p>
          <p className="text-warm-accent font-medium break-all">
            /s/{couple.slug}
          </p>
        </div>
      )}

      <ReadinessCard
        score={readiness.score}
        suggestions={readiness.suggestions}
        actions={readiness.actions}
      />
    </div>
  )
}
