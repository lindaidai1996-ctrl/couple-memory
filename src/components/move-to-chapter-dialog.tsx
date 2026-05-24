import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

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
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      width="md"
      hideFooter
    >
      <div className="space-y-2">
        {chapters.map(chapter => (
          <Button
            key={chapter.id}
            fullWidth
            variant="secondary"
            onClick={() => onSelect(chapter.id)}
            className="justify-start"
          >
            {chapter.title}
          </Button>
        ))}
      </div>
    </Modal>
  )
}
