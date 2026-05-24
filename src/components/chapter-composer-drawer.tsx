'use client'

import { useState } from 'react'
import { Button, PlusIcon } from '@/components/ui/button'
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer'
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
    <ResponsiveDrawer open={open} onClose={onClose} ariaLabel={copy.title}>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="border-b border-warm-border px-5 py-4 lg:px-6 lg:py-5">
          <h2 className="text-lg font-semibold text-warm-text">{copy.title}</h2>
          <p className="mt-1 text-sm text-warm-muted">{copy.description}</p>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 lg:p-6">
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
                    <img src={photo.thumbnailUrl} alt={photo.fileName} className="h-full w-full object-cover" />
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
                  <Button
                    key={item}
                    size="sm"
                    pill
                    variant="subtle"
                    onClick={() => setTitle(item)}
                  >
                    {item}
                  </Button>
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
        </div>

        <footer className="border-t border-warm-border px-5 py-4 lg:px-6">
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              {copy.cancel}
            </Button>
            <Button
              variant="brand"
              leadingIcon={<PlusIcon />}
              onClick={() => onSubmit({ title: title.trim(), backgroundNote: backgroundNote.trim() })}
              disabled={!title.trim()}
            >
              {copy.createChapter}
            </Button>
          </div>
        </footer>
      </div>
    </ResponsiveDrawer>
  )
}
