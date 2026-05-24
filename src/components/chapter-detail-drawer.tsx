'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AlbumChapterCardData } from './album-chapter-card'

export type ChapterDetailDrawerCopy = {
  title: string
  description: string
  cancel: string
  save: string
}

export function buildChapterDetailDraft(chapter: AlbumChapterCardData | null) {
  return {
    title: chapter?.title ?? '',
    backgroundNote: chapter?.backgroundNote ?? '',
  }
}

export function ChapterDetailDrawer({
  chapter,
  open,
  copy,
  onClose,
  onSave,
}: {
  chapter: AlbumChapterCardData | null
  open: boolean
  copy: ChapterDetailDrawerCopy
  onClose: () => void
  onSave: (payload: { title: string; backgroundNote: string }) => Promise<void> | void
}) {
  const [title, setTitle] = useState(buildChapterDetailDraft(chapter).title)
  const [backgroundNote, setBackgroundNote] = useState(buildChapterDetailDraft(chapter).backgroundNote)

  if (!open || !chapter) return null

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-warm-surface border-l border-warm-border p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-warm-text">{copy.title}</h2>
        <p className="text-sm text-warm-muted mt-1">{copy.description}</p>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text"
      />
      <textarea
        value={backgroundNote}
        onChange={e => setBackgroundNote(e.target.value)}
        rows={4}
        className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none"
      />

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button variant="brand" onClick={() => onSave({ title: title.trim(), backgroundNote: backgroundNote.trim() })}>
          {copy.save}
        </Button>
      </div>
    </aside>
  )
}
