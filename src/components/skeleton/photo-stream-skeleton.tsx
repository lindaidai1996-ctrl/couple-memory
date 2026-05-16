import { Skeleton } from './skeleton'

export function PhotoStreamSkeleton() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4">
      <Skeleton variant="film" className="w-full aspect-[21/9]" radius="lg" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="film" className="aspect-square w-full" radius="md" />
        ))}
      </div>
      <Skeleton variant="film" className="w-full aspect-[16/9]" radius="lg" />
    </div>
  )
}
