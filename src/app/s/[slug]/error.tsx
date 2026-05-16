'use client'

import { useRouter, useParams } from 'next/navigation'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-[72px] md:text-[96px] font-bold select-none leading-none mb-4"
        style={{ fontFamily: 'var(--font-latin)', color: '#3a3a3a' }}
      >
        Oops
      </p>
      <p className="text-base text-film-text mb-2">页面开小差了</p>
      <p className="text-sm text-film-muted mb-8">别担心，刷新一下通常就好了</p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-medium text-film-text bg-film-accent
            rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
        >
          刷新页面
        </button>
        <button
          onClick={() => router.push(`/s/${slug}`)}
          className="px-5 py-2.5 text-sm font-medium text-film-muted border border-film-surface
            rounded-[var(--radius-md)] hover:bg-film-surface transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}
