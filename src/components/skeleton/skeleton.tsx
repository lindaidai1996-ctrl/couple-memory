interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'warm' | 'film'
  className?: string
}

const radiusMap = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: '9999px',
} as const

export function Skeleton({
  width,
  height,
  radius = 'md',
  variant = 'warm',
  className = '',
}: SkeletonProps) {
  const gradient = variant === 'warm'
    ? 'linear-gradient(90deg, var(--color-warm-border) 25%, var(--color-warm-sidebar) 50%, var(--color-warm-border) 75%)'
    : 'linear-gradient(90deg, var(--color-film-surface) 25%, #2e2e2e 50%, var(--color-film-surface) 75%)'

  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radiusMap[radius],
        backgroundImage: gradient,
        backgroundSize: '200% 100%',
      }}
    />
  )
}
