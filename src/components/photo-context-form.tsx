export function PhotoContextForm({
  momentContext,
  momentPromptAnswer,
  onMomentContextChange,
  onMomentPromptAnswerChange,
}: {
  momentContext: string
  momentPromptAnswer: string
  onMomentContextChange: (value: string) => void
  onMomentPromptAnswerChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">这张照片想留住什么</span>
        <textarea
          value={momentContext}
          onChange={e => onMomentContextChange(e.target.value)}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">如果要补一句给 AI</span>
        <textarea
          value={momentPromptAnswer}
          onChange={e => onMomentPromptAnswerChange(e.target.value)}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none"
        />
      </label>
    </div>
  )
}
