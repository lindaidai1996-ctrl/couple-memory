export type ChapterSelectionToolbarCopy = {
  selectedCount: string
  createChapter: string
  moveToChapter: string
  ungroupPhotos: string
  cancel: string
}

export function ChapterSelectionToolbar({
  copy,
  onCreate,
  onMove,
  onUngroup,
  onCancel,
}: {
  copy: ChapterSelectionToolbarCopy
  onCreate: () => void
  onMove: () => void
  onUngroup: () => void
  onCancel: () => void
}) {
  return (
    <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-warm-border bg-warm-surface p-4 shadow-lg">
      <div className="text-sm text-warm-text">{copy.selectedCount}</div>
      <div className="flex items-center gap-2">
        <button onClick={onCreate} className="px-3 py-2 rounded-[var(--radius-md)] bg-warm-accent text-white text-sm">{copy.createChapter}</button>
        <button onClick={onMove} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">{copy.moveToChapter}</button>
        <button onClick={onUngroup} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">{copy.ungroupPhotos}</button>
        <button onClick={onCancel} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">{copy.cancel}</button>
      </div>
    </div>
  )
}
