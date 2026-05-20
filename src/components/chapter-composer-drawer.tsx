'use client'

import { useState } from 'react'
import type { PhotoData } from './photo-card'

export type ChapterComposerDrawerCopy = {
  title: string
  description: string
  selectedPhotos: string
  suggestedTitles: string
  chapterTitle: string
  backgroundNote: string
  cancel: string
  createChapter: string
}

export function ChapterComposerDrawer({
  open,
  selectedPhotos,
  suggestedTitles,
  copy,
  onClose,
  onSubmit,
}: {
  open: boolean
  selectedPhotos: PhotoData[]
  suggestedTitles: string[]
  copy: ChapterComposerDrawerCopy
  onClose: () => void
  onSubmit: (payload: { title: string; backgroundNote: string }) => Promise<void> | void
}) {
  const [title, setTitle] = useState('')
  const [backgroundNote, setBackgroundNote] = useState('')

  if (!open) return null

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-warm-surface border-l border-warm-border p-5 space-y-5 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-warm-text">{copy.title}</h2>
        <p className="text-sm text-warm-muted mt-1">{copy.description}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-warm-text">{copy.selectedPhotos}</p>
        <div className="grid grid-cols-4 gap-2">
          {selectedPhotos.slice(0, 8).map(photo => (
            <div
              key={photo.id}
              className="aspect-square overflow-hidden rounded-[var(--radius-md)] bg-warm-skeleton-base"
            >
              {photo.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.thumbnailUrl} alt={photo.fileName} className="w-full h-full object-cover" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {suggestedTitles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-warm-text">{copy.suggestedTitles}</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTitles.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setTitle(item)}
                className="px-3 py-1.5 rounded-full border border-warm-border text-sm text-warm-text"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">{copy.chapterTitle}</span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">{copy.backgroundNote}</span>
        <textarea
          value={backgroundNote}
          onChange={e => setBackgroundNote(e.target.value)}
          rows={4}
          className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none"
        />
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-warm-text border border-warm-border rounded-[var(--radius-md)]"
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ title: title.trim(), backgroundNote: backgroundNote.trim() })}
          disabled={!title.trim()}
          className="px-4 py-2 text-sm text-white bg-warm-accent rounded-[var(--radius-md)] disabled:opacity-50"
        >
          {copy.createChapter}
        </button>
      </div>
    </aside>
  )
}
