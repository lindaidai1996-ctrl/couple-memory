import { Skeleton } from './skeleton'

export function HeroSkeleton() {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-film-surface via-film-bg to-film-bg" />
      <div className="relative z-10 text-center space-y-6">
        <Skeleton variant="film" width={320} height={48} radius="md" className="mx-auto" />
        <Skeleton variant="film" width={240} height={20} radius="sm" className="mx-auto" />
      </div>
    </section>
  )
}
