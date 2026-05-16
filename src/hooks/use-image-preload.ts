import { useEffect, useRef, useState } from 'react'

interface UseImagePreloadOptions {
  rootMargin?: string
}

export function useImagePreload(
  src: string | null | undefined,
  { rootMargin = '200px' }: UseImagePreloadOptions = {}
) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!src || loaded) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image()
          img.onload = () => setLoaded(true)
          img.onerror = () => setLoaded(true)
          img.src = src
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [src, rootMargin, loaded])

  return { ref, loaded }
}
