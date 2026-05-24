import Link from 'next/link'

import { ArrowRightIcon, buttonClassName } from '@/components/ui/button'
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
    <section className="dashboard-panel mt-6 rounded-[var(--radius-xl)] p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_210px]">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-warm-accent">Readiness Note</p>
            <h2 className="mt-2 font-[var(--font-display)] text-[28px] leading-none tracking-[-0.04em] text-warm-text">
              整理准备度
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-warm-muted">
              看看这一阶段的照片还差多少整理成回忆章节，让时间线和相册更接近一篇完整叙事。
            </p>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map(item => (
                <div
                  key={item}
                  className="rounded-[var(--radius-md)] border border-warm-border bg-[var(--dashboard-accent-soft)] px-4 py-3 text-sm leading-6 text-warm-text"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-warm-border bg-[var(--dashboard-accent-soft)] px-4 py-3 text-sm leading-6 text-warm-text">
              这一阶段的回忆已经整理得比较完整了。
            </div>
          )}

          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions.map(action => (
                <Link
                  key={`${action.href}:${action.label}`}
                  href={action.href}
                  className={buttonClassName({
                    variant: 'secondary',
                    size: 'sm',
                    className: 'inline-flex items-center',
                  })}
                >
                  <span className="cm-button__label">{action.label}</span>
                  <span className="cm-button__icon" aria-hidden="true"><ArrowRightIcon /></span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-warm-border bg-[var(--dashboard-surface-gradient)] p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-warm-accent">Curation Score</p>
          <div className="mt-5 flex items-end gap-2">
            <p className="font-[var(--font-display)] text-[68px] leading-none tracking-[-0.06em] text-warm-text">
              {score}
            </p>
            <p className="pb-2 text-xs text-warm-muted">/ 100</p>
          </div>
          <div className="mt-5 h-px w-full bg-gradient-to-r from-warm-accent/55 to-transparent" />
          <p className="mt-3 text-xs leading-5 text-warm-muted">
            分数越高，说明照片越接近可直接生成章节与故事线的状态。
          </p>
        </div>
      </div>
    </section>
  )
}
