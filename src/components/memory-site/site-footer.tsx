import type { CSSProperties } from 'react'

import Link from 'next/link'

export function SiteFooter({
  closing,
  ctaHref,
  ctaLabel,
}: {
  closing: string
  ctaHref?: string | null
  ctaLabel?: string
}) {
  const contentRevealStyle = { ['--memory-site-reveal-delay' as const]: '80ms' } as CSSProperties
  const actionRevealStyle = { ['--memory-site-reveal-delay' as const]: '160ms' } as CSSProperties

  return (
    <footer className="rounded-[var(--vp-radius-xl)] border border-[var(--vp-border-light)] bg-[var(--vp-panel-strong-light)] px-6 py-8 text-center shadow-[var(--vp-shadow-soft)]">
      <p
        data-memory-site-reveal-child
        style={contentRevealStyle}
        className="mx-auto max-w-3xl text-base leading-8 text-[var(--vp-text-light)]"
      >
        {closing}
      </p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          data-memory-site-reveal-child
          style={actionRevealStyle}
          className="vp-memory-site-action mt-6 inline-flex items-center justify-center border border-[var(--vp-border-light)] bg-white/70 px-5 py-2.5 text-xs uppercase tracking-[0.24em] text-[var(--vp-text-light)]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </footer>
  )
}
