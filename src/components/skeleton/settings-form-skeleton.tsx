import { Skeleton } from './skeleton'

export function SettingsFormSkeleton() {
  return (
    <div className="max-w-2xl">
      <Skeleton width={128} height={32} radius="md" className="mb-6" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border space-y-4"
          >
            <Skeleton width={80} height={16} radius="sm" />
            <Skeleton className="w-full" height={40} radius="md" />
            <Skeleton className="w-full" height={40} radius="md" />
          </div>
        ))}
      </div>
    </div>
  )
}
