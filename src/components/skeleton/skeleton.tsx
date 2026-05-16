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

export function buildSkeletonGradient(variant: NonNullable<SkeletonProps['variant']>) {
  return variant === 'warm'
    ? 'linear-gradient(90deg, var(--color-warm-skeleton-base) 25%, var(--color-warm-skeleton-highlight) 50%, var(--color-warm-skeleton-base) 75%)'
    : 'linear-gradient(90deg, var(--color-film-skeleton-base) 25%, var(--color-film-skeleton-highlight) 50%, var(--color-film-skeleton-base) 75%)'
}

export function Skeleton({
  width,
  height,
  radius = 'md',
  variant = 'warm',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radiusMap[radius],
        backgroundImage: buildSkeletonGradient(variant),
        backgroundSize: '200% 100%',
      }}
    />
  )
}
