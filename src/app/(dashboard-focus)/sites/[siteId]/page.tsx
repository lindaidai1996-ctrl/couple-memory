import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import {
  buildMemorySitePreviewModel,
} from '@/lib/memory-sites/site-page-model'
import {
  MemorySiteDetailActions,
  buildMemorySiteReplacePhotoOptionLabel,
  buildMemorySiteReplacePhotoOptionSummary,
  buildMemorySiteReviewBarState,
  buildMemorySiteReviewMode,
} from '@/components/memory-site-detail-actions'
import { SiteFooter } from '@/components/memory-site/site-footer'
import { SiteHero } from '@/components/memory-site/site-hero'
import { MemorySiteReveal } from '@/components/memory-site/memory-site-reveal'
import { SiteSection } from '@/components/memory-site/site-section'
import { auth } from '@/lib/auth'
import { buildPublicMemorySitePath } from '@/lib/public-routes'
import {
  getMemorySiteById,
  getMemorySiteEditorSource,
} from '@/lib/memory-sites/site-queries'
import { prisma } from '@/lib/prisma'
import { buildMemorySiteShellClassName } from '@/app/story/[slug]/site/page'

export function buildMemorySiteReviewActions() {
  return ['regenerateSelection', 'replacePhoto', 'editCopy', 'publish'] as const
}

export {
  buildMemorySitePreviewModel,
  buildMemorySiteReplacePhotoOptionLabel,
  buildMemorySiteReplacePhotoOptionSummary,
  buildMemorySiteReviewBarState,
  buildMemorySiteReviewMode,
}

export default async function MemorySiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { siteId } = await params
  const t = await getTranslations('MemorySiteDetailPage')

  const coupleUser = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id },
    select: {
      coupleId: true,
      couple: {
        select: {
          name: true,
          slug: true,
          isPublic: true,
          plan: true,
        },
      },
    },
  })

  if (!coupleUser) {
    notFound()
  }

  const site = await getMemorySiteById(coupleUser.coupleId, siteId)
  if (!site) {
    notFound()
  }

  const editorSource = await getMemorySiteEditorSource(
    coupleUser.coupleId,
    site.sourceChapterIds
  )

  const previewModel = buildMemorySitePreviewModel(site)

  return (
    <div className="min-h-full space-y-4">
      <MemorySiteDetailActions
        key={`${site.id}:${site.payload.selectionVariant ?? 0}:${site.title}:${site.coverPhotoUrl ?? ''}`}
        coupleId={coupleUser.coupleId}
        site={site}
        editorSource={editorSource}
        publicHref={
          coupleUser.couple.slug
            ? buildPublicMemorySitePath(coupleUser.couple.slug)
            : null
        }
        text={{
          back: t('back'),
          reviewDraft: t('reviewDraft'),
          reviewPublished: t('reviewPublished'),
          reviewModeHint: t('reviewModeHint'),
          edit: t('edit'),
          reviewPanelTitle: t('reviewPanelTitle'),
          regenerateSelection: t('regenerateSelection'),
          replacePhoto: t('replacePhoto'),
          editCopy: t('editCopy'),
          publish: t('publish'),
          publishLocked: t('publishLocked'),
          openPublicPage: t('openPublicPage'),
          actionsFailed: t('actionsFailed'),
          actionsSaved: t('actionsSaved'),
          reviewSelectionUpdated: t('reviewSelectionUpdated'),
          sourceSummary: t('sourceSummary'),
          replaceDialogTitle: t('replaceDialogTitle'),
          replaceDialogDescription: t('replaceDialogDescription'),
          replaceChapterLabel: t('replaceChapterLabel'),
          replaceCurrentPhotoLabel: t('replaceCurrentPhotoLabel'),
          replaceNextPhotoLabel: t('replaceNextPhotoLabel'),
          replaceEmpty: t('replaceEmpty'),
          replaceConfirm: t('replaceConfirm'),
          copyDialogTitle: t('copyDialogTitle'),
          copyDialogDescription: t('copyDialogDescription'),
          copyTitleLabel: t('copyTitleLabel'),
          copySubtitleLabel: t('copySubtitleLabel'),
          copyIntroLabel: t('copyIntroLabel'),
          copyClosingLabel: t('copyClosingLabel'),
          copySectionTitleLabel: t('copySectionTitleLabel'),
          copySectionSummaryLabel: t('copySectionSummaryLabel'),
          copyConfirm: t('copyConfirm'),
          close: t('close'),
        }}
      />

      <main className={buildMemorySiteShellClassName()}>
        <SiteHero
          model={{
            title: previewModel.title,
            subtitle: previewModel.subtitle,
            intro: previewModel.intro,
            coverPhotoUrl: previewModel.coverPhotoUrl,
            slug: coupleUser.couple.slug ?? '',
          }}
          eyebrow={coupleUser.couple.name}
        />
        <div className="mx-auto flex w-full max-w-[var(--vp-memory-site-max-width)] flex-col gap-12 px-6 pb-24 pt-12">
          {previewModel.sections.map(section => (
            <MemorySiteReveal key={section.chapterId} stagger="children">
              <SiteSection section={section} />
            </MemorySiteReveal>
          ))}
          <MemorySiteReveal stagger="children">
            <SiteFooter closing={previewModel.closing} />
          </MemorySiteReveal>
        </div>
      </main>
    </div>
  )
}
