import { Skeleton } from './skeleton'

export function PhotoGridSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton width={36} height={36} radius="sm" />
        <Skeleton width={128} height={32} radius="md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" radius="md" />
        ))}
      </div>
    </div>
  )
}
