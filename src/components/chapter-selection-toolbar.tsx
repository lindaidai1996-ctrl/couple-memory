import { Button, PlusIcon, ArrowRightIcon } from '@/components/ui/button'

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
        <Button size="sm" variant="brand" leadingIcon={<PlusIcon />} onClick={onCreate}>{copy.createChapter}</Button>
        <Button size="sm" variant="secondary" trailingIcon={<ArrowRightIcon />} onClick={onMove}>{copy.moveToChapter}</Button>
        <Button size="sm" variant="subtle" onClick={onUngroup}>{copy.ungroupPhotos}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>{copy.cancel}</Button>
      </div>
    </div>
  )
}
