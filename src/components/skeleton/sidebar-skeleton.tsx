import { Skeleton } from './skeleton'

export function SidebarSkeleton() {
  return (
    <aside className="w-60 bg-warm-sidebar border-r border-warm-border flex flex-col">
      <div className="px-6 py-5 border-b border-warm-border">
        <Skeleton width={48} height={48} radius="full" />
      </div>
      <div className="px-3 py-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-full" height={36} radius="md" />
        ))}
      </div>
    </aside>
  )
}
