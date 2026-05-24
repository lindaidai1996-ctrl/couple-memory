'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function ResponsiveDrawer({
  open,
  onClose,
  children,
  panelClassName,
  overlayClassName,
  ariaLabel,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  panelClassName?: string
  overlayClassName?: string
  ariaLabel?: string
}) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const portalTarget = typeof window === 'undefined' ? null : document.body

  if (!open || !portalTarget) {
    return null
  }

  const panelStyle = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    ? {
        position: 'fixed' as const,
        top: 0,
        right: 0,
        height: '100vh',
        width: 'min(30rem, 100vw)',
        borderLeft: '1px solid var(--color-warm-border)',
        borderBottomLeftRadius: '30px',
        background: 'var(--color-warm-surface)',
        boxShadow: '0 24px 60px rgba(25,17,24,0.24)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        pointerEvents: 'auto' as const,
        willChange: 'transform, opacity',
        zIndex: 121,
      }
    : {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        height: 'min(88vh, 52rem)',
        borderBottom: '1px solid var(--color-warm-border)',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        background: 'var(--color-warm-surface)',
        boxShadow: '0 24px 60px rgba(25,17,24,0.24)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        pointerEvents: 'auto' as const,
        willChange: 'transform, opacity',
        zIndex: 121,
      }
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
      <button
        type="button"
        aria-label="Close drawer overlay"
        onClick={onClose}
        className={joinClassNames(overlayClassName)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          border: 0,
          padding: 0,
          margin: 0,
          animation: 'cm-drawer-overlay-in 220ms ease-out both',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={joinClassNames('cm-responsive-drawer', panelClassName)}
        data-drawer-direction={isDesktop ? 'right' : 'top'}
        style={{
          ...panelStyle,
          animation: isDesktop
            ? 'cm-drawer-slide-in-right 280ms cubic-bezier(0.22, 1, 0.36, 1) both'
            : 'cm-drawer-slide-in-top 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <div className="h-full">{children}</div>
      </div>
    </div>,
    portalTarget
  )
}
