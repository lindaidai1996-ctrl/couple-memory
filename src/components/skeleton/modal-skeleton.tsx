import { Skeleton } from './skeleton'

export function ModalSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Skeleton className="w-full md:w-2/3 aspect-[4/3]" radius="lg" />
      <div className="flex-1 space-y-4">
        <Skeleton width="80%" height={20} radius="sm" />
        <Skeleton width="60%" height={14} radius="sm" />
        <Skeleton width="40%" height={14} radius="sm" />
        <Skeleton className="w-full" height={60} radius="md" />
      </div>
    </div>
  )
}
