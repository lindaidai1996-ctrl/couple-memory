import Link from 'next/link'

import type { OrganizationReadinessAction } from '@/lib/readiness/organization-readiness'

export function ReadinessCard({
  score,
  suggestions,
  actions,
}: {
  score: number
  suggestions: string[]
  actions: OrganizationReadinessAction[]
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

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map(action => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              className="inline-flex items-center rounded-[var(--radius-md)] border border-warm-accent/25
                bg-warm-accent/10 px-3 py-1.5 text-sm font-medium text-warm-accent transition-colors
                hover:bg-warm-accent/15"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}
