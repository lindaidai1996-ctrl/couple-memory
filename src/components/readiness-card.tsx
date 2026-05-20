export function ReadinessCard({
  score,
  suggestions,
}: {
  score: number
  suggestions: string[]
}) {
  return (
    <section className="mt-8 rounded-[var(--radius-lg)] border border-warm-border bg-warm-surface p-5 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-warm-text">整理准备度</h2>
          <p className="text-sm text-warm-muted mt-1">看看这一阶段的照片还差多少整理成回忆章节。</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-warm-text">{score}</p>
          <p className="text-xs text-warm-muted">/ 100</p>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map(item => (
            <p key={item} className="text-sm text-warm-text">{item}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-warm-muted">这一阶段的回忆已经整理得比较完整了。</p>
      )}
    </section>
  )
}
