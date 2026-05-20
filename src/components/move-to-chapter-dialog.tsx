type MoveChapterOption = {
  id: string
  title: string
}

export type MoveToChapterDialogCopy = {
  title: string
  description: string
}

export function MoveToChapterDialog({
  open,
  chapters,
  copy,
  onSelect,
  onClose,
}: {
  open: boolean
  chapters: MoveChapterOption[]
  copy: MoveToChapterDialogCopy
  onSelect: (chapterId: string) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] bg-warm-surface border border-warm-border p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-warm-text">{copy.title}</h2>
          <p className="text-sm text-warm-muted mt-1">{copy.description}</p>
        </div>
        <div className="space-y-2">
          {chapters.map(chapter => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => onSelect(chapter.id)}
              className="w-full rounded-[var(--radius-md)] border border-warm-border px-4 py-3 text-left text-sm text-warm-text"
            >
              {chapter.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
