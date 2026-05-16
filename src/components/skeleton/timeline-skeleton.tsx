import { Skeleton } from './skeleton'

export function TimelineSkeleton() {
  return (
    <div className="relative">
      <div className="absolute top-0 bottom-0 w-px bg-film-accent/20 left-6 md:left-1/2 md:-translate-x-px" />
      <div className="space-y-10 md:space-y-14">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`relative flex items-start pl-14 md:pl-0 ${
              i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            <div className="absolute z-10 w-4 h-4 rounded-full border-2 border-film-muted bg-film-muted/20 top-2 left-[18px] md:left-1/2 md:-translate-x-1/2" />
            <div className="hidden md:block md:w-1/2" />
            <div className="md:w-1/2 md:px-8 w-full">
              <div className="bg-film-surface rounded-[var(--radius-lg)] p-5 border border-film-accent/10 space-y-3">
                <Skeleton variant="film" width="30%" height={12} radius="sm" />
                <Skeleton variant="film" width="70%" height={18} radius="sm" />
                <Skeleton variant="film" width="90%" height={14} radius="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
