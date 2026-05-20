export type AlbumEmptyChaptersCopy = {
  title: string
  description: string
  action: string
}

export function AlbumEmptyChapters({
  onCreate,
  copy,
}: {
  onCreate: () => void
  copy: AlbumEmptyChaptersCopy
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-dashed border-warm-border bg-warm-surface p-6 text-center space-y-3">
      <div>
        <h2 className="text-base font-semibold text-warm-text">{copy.title}</h2>
        <p className="text-sm text-warm-muted mt-1">{copy.description}</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="px-4 py-2 rounded-[var(--radius-md)] bg-warm-accent text-white text-sm"
      >
        {copy.action}
      </button>
    </section>
  )
}
