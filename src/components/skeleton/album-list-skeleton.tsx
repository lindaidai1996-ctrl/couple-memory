import { Skeleton } from './skeleton'

export function AlbumListSkeleton() {
  return (
    <div>
      <Skeleton width={160} height={32} radius="md" className="mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border overflow-hidden"
          >
            <Skeleton className="w-full h-40" radius="sm" />
            <div className="p-4 space-y-2">
              <Skeleton width="60%" height={16} radius="sm" />
              <Skeleton width="30%" height={12} radius="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
