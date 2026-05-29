import Link from 'next/link'

export type MemorySiteHeroModel = {
  title: string
  subtitle: string | null
  intro: string
  coverPhotoUrl: string | null
  slug: string
}

export function SiteHero({
  model,
  backHref,
  backLabel,
  eyebrow = 'Memory Site',
}: {
  model: MemorySiteHeroModel
  backHref?: string | null
  backLabel?: string
  eyebrow?: string
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        {model.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.coverPhotoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[var(--vp-memory-site-hero-overlay)]" />
      </div>

      <div className="relative mx-auto flex min-h-[72vh] w-full max-w-[var(--vp-memory-site-max-width)] flex-col justify-end px-6 pb-14 pt-10 md:pb-18">
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="vp-memory-site-action mb-8 inline-flex w-fit items-center gap-2 border border-white/18 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/84 backdrop-blur-sm"
          >
            {backLabel}
          </Link>
        ) : null}
        <p className="text-[11px] uppercase tracking-[0.34em] text-white/78">{eyebrow}</p>
        <h1 className="vp-memory-site-hero-title mt-4 max-w-4xl text-white">
          {model.title}
        </h1>
        {model.subtitle ? (
          <p className="mt-4 max-w-2xl text-sm uppercase tracking-[0.18em] text-white/74">
            {model.subtitle}
          </p>
        ) : null}
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
          {model.intro}
        </p>
      </div>
    </section>
  )
}
