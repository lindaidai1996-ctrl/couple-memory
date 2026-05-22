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

function formatStartDate(date: Date | null) {
  if (!date) return null

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-2xl rounded-[28px] border border-warm-border bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(243,231,236,0.82))] px-6 py-8 text-center shadow-[0_20px_48px_rgba(49,28,39,0.10)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-warm-muted">
            Dashboard
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-[clamp(2rem,4vw,3.4rem)] leading-none tracking-[-0.04em] text-warm-text">
            {t('emptyTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-warm-muted">
            {t('emptySubtitle')}
          </p>
          <a
            href="/settings"
            className="mt-6 inline-flex rounded-[18px] border border-white/30 bg-[linear-gradient(135deg,#5b3a52_0%,#c9a2a1_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(72,37,57,0.18)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('goToSettings')}
          </a>
        </div>
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
  const readinessCard = buildDashboardReadinessCard({
    score: readiness.score,
    suggestions: readiness.suggestions,
    actions: readiness.actions,
  })
  const formattedStartDate = formatStartDate(couple.startDate)

  return (
    <div className="space-y-4 text-warm-text">
      <section
        className="relative overflow-hidden rounded-[28px] border border-white/45 bg-[linear-gradient(135deg,rgba(74,47,66,0.96)_0%,rgba(143,96,122,0.88)_46%,rgba(231,212,208,0.92)_100%)] px-5 py-5 text-white shadow-[0_24px_70px_rgba(56,28,46,0.20)] sm:px-6"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,245,247,0.18),transparent_30%)]" />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-white/68">
              <span>Dashboard</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>Velvet Plum</span>
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl font-[var(--font-display)] text-[clamp(2rem,4vw,3.6rem)] leading-[0.96] tracking-[-0.04em]">
                {couple.name || t('spaceNameFallback')}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/78 sm:text-[15px]">
                {t('welcomeBack', { name: session.user.name || '' })}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/18 bg-white/12 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/62">
                  Summary
                </p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/76">
                  {formattedStartDate
                    ? `从 ${formattedStartDate} 开始，这里持续整理你们的照片、章节与对外展示入口。`
                    : '这里集中整理你们的照片、章节与对外展示入口。'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/62">
                  Readiness
                </p>
                <p className="mt-2 font-[var(--font-display)] text-5xl leading-none tracking-[-0.05em] text-white">
                  {readinessCard.score}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/14 pt-4 text-white/80">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/56">
                  Suggestions
                </p>
                <p className="mt-2 font-[var(--font-display)] text-2xl leading-none">
                  {readinessCard.suggestionCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/56">
                  Actions
                </p>
                <p className="mt-2 font-[var(--font-display)] text-2xl leading-none">
                  {readinessCard.actionCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/56">
                  Public
                </p>
                <p className="mt-2 text-sm leading-5 text-white">
                  {couple.isPublic && couple.slug ? 'Live' : 'Private'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat, index) => (
            <article
              key={stat.label}
              className="group relative overflow-hidden rounded-[22px] border border-warm-border bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(247,238,241,0.78))] p-4 shadow-[0_10px_32px_rgba(49,28,39,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(49,28,39,0.12)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(111,79,102,0.32),transparent)]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-warm-muted">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-3 text-sm text-warm-muted">{stat.label}</p>
                </div>
                <span className="rounded-full border border-[rgba(111,79,102,0.14)] bg-[rgba(111,79,102,0.08)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[rgba(111,79,102,0.84)]">
                  Archive
                </span>
              </div>
              <p className="mt-6 font-[var(--font-display)] text-[clamp(2rem,5vw,3.2rem)] leading-none tracking-[-0.05em] text-warm-text">
                {stat.value}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-warm-muted">
                {stat.suffix}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-[24px] border border-warm-border bg-[linear-gradient(160deg,rgba(255,255,255,0.88),rgba(244,232,237,0.84))] p-5 shadow-[0_14px_40px_rgba(49,28,39,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-warm-muted">
                Public Link
              </p>
              <h2 className="mt-3 font-[var(--font-display)] text-[28px] leading-none tracking-[-0.04em] text-warm-text">
                分享页入口
              </h2>
            </div>
            <span className="rounded-full border border-[rgba(111,79,102,0.14)] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted">
              {couple.isPublic && couple.slug ? 'Published' : 'Private'}
            </span>
          </div>

          {couple.isPublic && couple.slug ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm leading-6 text-warm-muted">
                {t('publicLink')}
              </p>
              <div className="rounded-[20px] border border-[rgba(111,79,102,0.14)] bg-[rgba(255,255,255,0.76)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-warm-muted">
                  URL
                </p>
                <p className="mt-2 break-all font-medium text-[rgba(83,52,72,0.92)]">
                  /s/{couple.slug}
                </p>
              </div>
              <p className="text-xs leading-5 text-warm-muted">
                当前空间已对外开放，可将入口直接分享给访客查看。
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-[rgba(111,79,102,0.18)] bg-[rgba(255,255,255,0.52)] px-4 py-5">
              <p className="text-sm leading-6 text-warm-muted">
                公开入口仍处于关闭状态，启用后这里会显示可分享的专属链接。
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[26px] border border-warm-border bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,244,246,0.82))] p-3 shadow-[0_14px_34px_rgba(49,28,39,0.06)] sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-warm-muted">
              Curation
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-[26px] leading-none tracking-[-0.04em] text-warm-text">
              整理进度
            </h2>
          </div>
          <p className="max-w-xs text-right text-xs leading-5 text-warm-muted">
            {readinessCard.hasSuggestions
              ? `还有 ${readinessCard.suggestionCount} 条建议可以继续优化相册结构。`
              : '当前整理状态稳定，可以继续补充新的回忆内容。'}
          </p>
        </div>
        <ReadinessCard
          score={readiness.score}
          suggestions={readiness.suggestions}
          actions={readiness.actions}
        />
      </section>
    </div>
  )
}
