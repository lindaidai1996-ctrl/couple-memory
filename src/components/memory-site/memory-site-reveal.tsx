'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

type MemorySiteRevealProps = {
  children: ReactNode
  className?: string
  delayMs?: number
  stagger?: 'none' | 'children'
}

export function buildMemorySiteRevealClassName({
  stagger = 'none',
}: {
  stagger?: 'none' | 'children'
} = {}) {
  return stagger === 'children'
    ? 'memory-site-reveal memory-site-reveal-children'
    : 'memory-site-reveal'
}

export function buildMemorySiteRevealStyle({
  delayMs = 0,
}: {
  delayMs?: number
} = {}) {
  return {
    '--memory-site-reveal-delay': `${delayMs}ms`,
  } as CSSProperties
}

export function MemorySiteReveal({
  children,
  className,
  delayMs = 0,
  stagger = 'none',
}: MemorySiteRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || revealed) {
      return
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      const frame = globalThis.requestAnimationFrame(() => {
        setRevealed(true)
      })
      return () => globalThis.cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries
        if (!entry?.isIntersecting) {
          return
        }

        setRevealed(true)
        observer.disconnect()
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [revealed])

  return (
    <div
      ref={ref}
      data-revealed={revealed ? 'true' : 'false'}
      className={[buildMemorySiteRevealClassName({ stagger }), className].filter(Boolean).join(' ')}
      style={buildMemorySiteRevealStyle({ delayMs })}
    >
      {children}
    </div>
  )
}
