import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonScheme = 'velvet' | 'film'
export type ButtonVariant =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'secondary'
  | 'subtle'
  | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export type ButtonClassNameOptions = {
  scheme?: ButtonScheme
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  pill?: boolean
  iconOnly?: boolean
  className?: string
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonClassNameOptions & {
    leadingIcon?: ReactNode
    trailingIcon?: ReactNode
    loading?: boolean
  }

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function buttonClassName({
  scheme = 'velvet',
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  pill = false,
  iconOnly = false,
  className,
}: ButtonClassNameOptions = {}) {
  return joinClassNames(
    'cm-button',
    'inline-flex',
    `cm-button--${scheme}`,
    `cm-button--${variant}`,
    `cm-button--${size}`,
    fullWidth && 'cm-button--full',
    pill && 'cm-button--pill',
    iconOnly && 'cm-button--icon',
    className
  )
}

export function Button({
  children,
  scheme = 'velvet',
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  pill = false,
  iconOnly = false,
  className,
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={buttonClassName({
        scheme,
        variant,
        size,
        fullWidth,
        pill,
        iconOnly,
        className,
      })}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="cm-button__spinner" aria-hidden="true" />
      ) : leadingIcon ? (
        <span className="cm-button__icon" aria-hidden="true">{leadingIcon}</span>
      ) : null}
      {children ? <span className="cm-button__label">{children}</span> : null}
      {!loading && trailingIcon ? (
        <span className="cm-button__icon" aria-hidden="true">{trailingIcon}</span>
      ) : null}
    </button>
  )
}

type IconProps = {
  className?: string
}

function iconClassName(className?: string) {
  return joinClassNames('h-4 w-4', className)
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
      <path d="M19 15l.8 1.9L21.7 18l-1.9.8L19 20.7l-.8-1.9-1.9-.8 1.9-.8L19 15Z" />
      <path d="M5 14l1 2.4L8.4 17l-2.4 1L5 20.4 4 18 1.6 17 4 16.4 5 14Z" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3c0 4.97 4.03 9 9 9 .27 0 .53-.01.79-.21Z" />
    </svg>
  )
}

export function ScreenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 18v2" />
    </svg>
  )
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClassName(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}
