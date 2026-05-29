'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { VelvetSelect } from '@/components/forms/velvet-select'
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer'
import { Modal } from '@/components/ui/modal'
import { Button, XIcon } from '@/components/ui/button'
import type { MemorySiteListItem } from '@/lib/memory-sites/site-mappers'
import type { MemorySiteEditorSource } from '@/lib/memory-sites/site-queries'

type DetailActionsText = {
  back: string
  reviewDraft: string
  reviewPublished: string
  reviewModeHint: string
  edit: string
  reviewPanelTitle: string
  regenerateSelection: string
  replacePhoto: string
  editCopy: string
  publish: string
  publishLocked: string
  openPublicPage: string
  actionsFailed: string
  actionsSaved: string
  reviewSelectionUpdated: string
  sourceSummary: string
  replaceDialogTitle: string
  replaceDialogDescription: string
  replaceChapterLabel: string
  replaceCurrentPhotoLabel: string
  replaceNextPhotoLabel: string
  replaceEmpty: string
  replaceConfirm: string
  copyDialogTitle: string
  copyDialogDescription: string
  copyTitleLabel: string
  copySubtitleLabel: string
  copyIntroLabel: string
  copyClosingLabel: string
  copySectionTitleLabel: string
  copySectionSummaryLabel: string
  copyConfirm: string
  close: string
}

type Props = {
  coupleId: string
  site: MemorySiteListItem
  editorSource: MemorySiteEditorSource | null
  publicHref: string | null
  text: DetailActionsText
}

type ReviewTone = 'draft' | 'published'

export function buildMemorySiteReviewBarState() {
  return ['regenerateSelection', 'replacePhoto', 'editCopy'] as const
}

export function buildMemorySiteReplacePhotoOptionLabel(index: number) {
  return `图片 ${index + 1}`
}

export function buildMemorySiteReplacePhotoOptionSummary(narrative: string) {
  const normalized = narrative.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return ''
  }

  const firstSentence = normalized.split(/[。！？!?]/)[0]?.trim() ?? normalized
  const summary = firstSentence || normalized

  return summary.length > 24 ? `${summary.slice(0, 24).trimEnd()}…` : summary
}

export function buildMemorySiteReviewMode({
  status,
  publicHref,
}: {
  status: MemorySiteListItem['status']
  publicHref: string | null
}) {
  const isPublished = status === 'PUBLISHED'

  return {
    tone: (isPublished ? 'published' : 'draft') as ReviewTone,
    primaryAction: isPublished ? 'openPublicPage' : 'publish',
    opensPublicPage: isPublished && Boolean(publicHref),
  }
}

export function MemorySiteDetailActions({
  coupleId,
  site,
  editorSource,
  publicHref,
  text,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [replaceChapterId, setReplaceChapterId] = useState(site.payload.sections[0]?.chapterId ?? '')
  const [replaceCurrentPhotoId, setReplaceCurrentPhotoId] = useState(
    site.payload.sections[0]?.photos[0]?.id ?? ''
  )
  const [replaceNextPhotoId, setReplaceNextPhotoId] = useState('')
  const [copyForm, setCopyForm] = useState(() => ({
    title: site.title,
    subtitle: site.subtitle ?? '',
    intro: site.intro,
    closing: site.closing,
    sections: site.payload.sections.map(section => ({
      chapterId: section.chapterId,
      title: section.title,
      summary: section.summary,
    })),
  }))

  const reviewMode = buildMemorySiteReviewMode({
    status: site.status,
    publicHref,
  })

  const currentSection = useMemo(
    () => site.payload.sections.find(section => section.chapterId === replaceChapterId) ?? null,
    [replaceChapterId, site.payload.sections]
  )
  const sourceChapter = useMemo(
    () => editorSource?.chapters.find(chapter => chapter.id === replaceChapterId) ?? null,
    [editorSource, replaceChapterId]
  )
  const replacementCandidates = useMemo(() => {
    if (!sourceChapter || !currentSection) {
      return []
    }

    const currentIds = new Set(currentSection.photos.map(photo => photo.id))
    return sourceChapter.photos.filter(photo => !currentIds.has(photo.id))
  }, [currentSection, sourceChapter])

  const replaceChapterOptions = site.payload.sections.map(section => ({
    value: section.chapterId,
    label: section.title,
  }))
  const replaceCurrentPhotoOptions = (currentSection?.photos ?? []).map((photo, index) => ({
    value: photo.id,
    label: buildMemorySiteReplacePhotoOptionLabel(index),
    description: buildMemorySiteReplacePhotoOptionSummary(photo.narrative),
  }))
  const replacementPhotoOptions = replacementCandidates.map((photo, index) => ({
    value: photo.id,
    label: buildMemorySiteReplacePhotoOptionLabel(index),
    description: buildMemorySiteReplacePhotoOptionSummary(photo.narrative),
  }))

  async function runAction(
    action: string,
    body: Record<string, unknown> = {},
    successMessage = text.actionsSaved
  ) {
    setActiveAction(action)
    setErrorMessage(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/couples/${coupleId}/memory-sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setErrorMessage(
          typeof payload?.error === 'string' ? payload.error : text.actionsFailed
        )
        return false
      }

      setMessage(successMessage)
      startTransition(() => {
        router.refresh()
      })
      return true
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <div className="sticky top-3 z-20 space-y-3">
      <div className="memory-site-review-bar overflow-hidden rounded-[24px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Link
              href="/sites"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-warm-muted transition-colors hover:text-warm-text dark:text-white/58 dark:hover:text-white/86"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {text.back}
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-white/72 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-warm-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-white/62">
              <span className={`h-2 w-2 rounded-full ${reviewMode.tone === 'published' ? 'bg-emerald-500' : 'bg-[var(--color-warm-accent)]'}`} />
              {reviewMode.tone === 'published' ? text.reviewPublished : text.reviewDraft}
            </span>
          </div>

          <p className="min-w-0 flex-1 text-center text-[11px] uppercase tracking-[0.18em] text-warm-muted/80 dark:text-white/42 max-sm:order-3 max-sm:basis-full max-sm:text-left">
            {text.reviewModeHint}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {reviewMode.opensPublicPage && publicHref ? (
              <a
                href={publicHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-warm-border bg-white/78 px-4 text-[11px] uppercase tracking-[0.18em] text-warm-text transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/92 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] dark:text-white/76 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] dark:hover:text-white/88"
              >
                {text.openPublicPage}
              </a>
            ) : (
              <Button
                variant="brand"
                className="dark:border-white/14"
                disabled={isPending}
                loading={activeAction === 'publish'}
                onClick={() => {
                  void runAction('publish')
                }}
              >
                {text.publish}
              </Button>
            )}
            <Button
              variant="secondary"
              className="dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] dark:text-white/82 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] dark:hover:border-white/12 dark:hover:text-white/90"
              disabled={isPending}
              onClick={() => {
                setEditorOpen(current => !current)
                setMessage(null)
                setErrorMessage(null)
              }}
            >
              {text.edit}
            </Button>
          </div>
        </div>

        {editorOpen ? (
          <div className="border-t border-warm-border/70 px-4 py-4 sm:px-5 dark:border-white/8">
            <div className="grid gap-3 lg:grid-cols-3">
              <article className="rounded-[20px] border border-warm-border bg-white/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-warm-muted dark:text-white/48">{text.reviewPanelTitle}</p>
                <h2 className="mt-3 font-[var(--font-dashboard-title)] text-[22px] leading-none tracking-[-0.04em] text-warm-text dark:text-white/92">
                  {text.regenerateSelection}
                </h2>
                <p className="mt-3 text-sm leading-6 text-warm-muted dark:text-white/62">
                  {text.sourceSummary.replace('{chapterCount}', String(site.sourceChapterIds.length))}
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    className="dark:border-white/10 dark:bg-white/[0.05] dark:text-white/86 dark:hover:bg-white/[0.08] dark:hover:border-white/14"
                    fullWidth
                    loading={activeAction === 'regenerateSelection'}
                    disabled={isPending}
                    onClick={() => {
                      void runAction('regenerateSelection', {}, text.reviewSelectionUpdated)
                    }}
                  >
                    {text.regenerateSelection}
                  </Button>
                </div>
              </article>

              <article className="rounded-[20px] border border-warm-border bg-white/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-warm-muted dark:text-white/48">{text.reviewPanelTitle}</p>
                <h2 className="mt-3 font-[var(--font-dashboard-title)] text-[22px] leading-none tracking-[-0.04em] text-warm-text dark:text-white/92">
                  {text.replacePhoto}
                </h2>
                <p className="mt-3 text-sm leading-6 text-warm-muted dark:text-white/62">
                  {text.replaceDialogDescription}
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    className="dark:border-white/10 dark:bg-white/[0.05] dark:text-white/86 dark:hover:bg-white/[0.08] dark:hover:border-white/14"
                    fullWidth
                    disabled={!editorSource || isPending}
                    onClick={() => {
                      setReplaceOpen(true)
                      setErrorMessage(null)
                      setMessage(null)
                    }}
                  >
                    {text.replacePhoto}
                  </Button>
                </div>
              </article>

              <article className="rounded-[20px] border border-warm-border bg-white/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-warm-muted dark:text-white/48">{text.reviewPanelTitle}</p>
                <h2 className="mt-3 font-[var(--font-dashboard-title)] text-[22px] leading-none tracking-[-0.04em] text-warm-text dark:text-white/92">
                  {text.editCopy}
                </h2>
                <p className="mt-3 text-sm leading-6 text-warm-muted dark:text-white/62">
                  {text.copyDialogDescription}
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    className="dark:border-white/10 dark:bg-white/[0.05] dark:text-white/86 dark:hover:bg-white/[0.08] dark:hover:border-white/14"
                    fullWidth
                    disabled={isPending}
                    onClick={() => {
                      setCopyOpen(true)
                      setErrorMessage(null)
                      setMessage(null)
                    }}
                  >
                    {text.editCopy}
                  </Button>
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-[18px] border border-emerald-500/18 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-[18px] border border-[color:var(--color-error)]/18 bg-[color:var(--color-error)]/6 px-4 py-3 text-sm leading-6 text-[color:var(--color-error)]">
          {errorMessage}
        </p>
      ) : null}

      <Modal
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title={text.replaceDialogTitle}
        description={text.replaceDialogDescription}
        cancelText={text.close}
        confirmText={text.replaceConfirm}
        confirmDisabled={!replaceChapterId || !replaceCurrentPhotoId || !replaceNextPhotoId}
        confirmLoading={activeAction === 'replacePhoto'}
        width="lg"
        onConfirm={() => {
          void runAction('replacePhoto', {
            chapterId: replaceChapterId,
            currentPhotoId: replaceCurrentPhotoId,
            replacementPhotoId: replaceNextPhotoId,
          }).then(success => {
            if (success) {
              setReplaceOpen(false)
            }
          })
        }}
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-warm-text">{text.replaceChapterLabel}</span>
            <VelvetSelect
              ariaLabel={text.replaceChapterLabel}
              fullWidth
              value={replaceChapterId}
              options={replaceChapterOptions}
              onChange={nextChapterId => {
                setReplaceChapterId(nextChapterId)
                const nextSection = site.payload.sections.find(section => section.chapterId === nextChapterId)
                setReplaceCurrentPhotoId(nextSection?.photos[0]?.id ?? '')
                setReplaceNextPhotoId('')
              }}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-warm-text">{text.replaceCurrentPhotoLabel}</span>
            <VelvetSelect
              ariaLabel={text.replaceCurrentPhotoLabel}
              fullWidth
              value={replaceCurrentPhotoId}
              options={replaceCurrentPhotoOptions}
              onChange={nextPhotoId => {
                setReplaceCurrentPhotoId(nextPhotoId)
                setReplaceNextPhotoId('')
              }}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-warm-text">{text.replaceNextPhotoLabel}</span>
            <VelvetSelect
              ariaLabel={text.replaceNextPhotoLabel}
              disabled={replacementPhotoOptions.length === 0}
              fullWidth
              placeholder={text.replaceEmpty}
              value={replaceNextPhotoId}
              options={replacementPhotoOptions}
              onChange={setReplaceNextPhotoId}
            />
          </label>
        </div>
      </Modal>

      <ResponsiveDrawer
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        ariaLabel={text.copyDialogTitle}
        panelClassName="bg-warm-surface"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-warm-border px-5 py-4 md:px-6">
            <div className="min-w-0 flex-1">
              <h3 className="font-[var(--font-dashboard-title)] text-[24px] leading-none tracking-[-0.04em] text-warm-text">
                {text.copyDialogTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-warm-muted">
                {text.copyDialogDescription}
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              aria-label={text.close}
              onClick={() => setCopyOpen(false)}
            >
              <XIcon />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-warm-text">{text.copyTitleLabel}</span>
                <input
                  value={copyForm.title}
                  onChange={event => setCopyForm(current => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-[16px] border border-warm-border bg-white/82 px-3 py-2 text-sm text-warm-text outline-none focus:border-warm-accent"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-warm-text">{text.copySubtitleLabel}</span>
                <input
                  value={copyForm.subtitle}
                  onChange={event => setCopyForm(current => ({ ...current, subtitle: event.target.value }))}
                  className="w-full rounded-[16px] border border-warm-border bg-white/82 px-3 py-2 text-sm text-warm-text outline-none focus:border-warm-accent"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-warm-text">{text.copyIntroLabel}</span>
                <textarea
                  value={copyForm.intro}
                  onChange={event => setCopyForm(current => ({ ...current, intro: event.target.value }))}
                  rows={4}
                  className="w-full rounded-[16px] border border-warm-border bg-white/82 px-3 py-2 text-sm text-warm-text outline-none focus:border-warm-accent"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-warm-text">{text.copyClosingLabel}</span>
                <textarea
                  value={copyForm.closing}
                  onChange={event => setCopyForm(current => ({ ...current, closing: event.target.value }))}
                  rows={3}
                  className="w-full rounded-[16px] border border-warm-border bg-white/82 px-3 py-2 text-sm text-warm-text outline-none focus:border-warm-accent"
                />
              </label>

              <div className="space-y-4">
                {copyForm.sections.map((section, index) => (
                  <div key={section.chapterId} className="rounded-[20px] border border-warm-border bg-white/55 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-warm-muted">
                      Chapter {String(index + 1).padStart(2, '0')}
                    </p>
                    <label className="mt-3 block space-y-2">
                      <span className="text-sm font-medium text-warm-text">{text.copySectionTitleLabel}</span>
                      <input
                        value={section.title}
                        onChange={event => setCopyForm(current => ({
                          ...current,
                          sections: current.sections.map(item =>
                            item.chapterId === section.chapterId
                              ? { ...item, title: event.target.value }
                              : item
                          ),
                        }))}
                        className="w-full rounded-[16px] border border-warm-border bg-white/82 px-3 py-2 text-sm text-warm-text outline-none focus:border-warm-accent"
                      />
                    </label>
                    <label className="mt-3 block space-y-2">
                      <span className="text-sm font-medium text-warm-text">{text.copySectionSummaryLabel}</span>
                      <textarea
                        value={section.summary}
                        onChange={event => setCopyForm(current => ({
                          ...current,
                          sections: current.sections.map(item =>
                            item.chapterId === section.chapterId
                              ? { ...item, summary: event.target.value }
                              : item
                          ),
                        }))}
                        rows={4}
                        className="w-full rounded-[16px] border border-warm-border bg-white/82 px-3 py-2 text-sm text-warm-text outline-none focus:border-warm-accent"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="border-t border-warm-border px-5 py-4 md:px-6">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setCopyOpen(false)}>
                {text.close}
              </Button>
              <Button
                variant="brand"
                loading={activeAction === 'editCopy'}
                onClick={() => {
                  void runAction('editCopy', copyForm).then(success => {
                    if (success) {
                      setCopyOpen(false)
                    }
                  })
                }}
              >
                {text.copyConfirm}
              </Button>
            </div>
          </footer>
        </div>
      </ResponsiveDrawer>
    </div>
  )
}
