'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Button, XIcon, type ButtonVariant } from '@/components/ui/button'

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | number | string

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  width?: ModalWidth
  showOverlay?: boolean
  closeOnOverlayClick?: boolean
  hideFooter?: boolean
  cancelText?: string
  confirmText?: string
  onCancel?: () => void
  onConfirm?: () => void | Promise<void>
  confirmVariant?: Extract<ButtonVariant, 'brand' | 'danger' | 'secondary'>
  confirmLoading?: boolean
  confirmDisabled?: boolean
}

type ModalSurfaceProps = Omit<ModalProps, 'open' | 'showOverlay' | 'closeOnOverlayClick'>

const MODAL_WIDTH_MAP: Record<Exclude<ModalWidth, number | string>, string> = {
  sm: '28rem',
  md: '32rem',
  lg: '40rem',
  xl: '48rem',
}

export function resolveModalWidth(width: ModalWidth = 'md') {
  if (typeof width === 'number') {
    return `${width}px`
  }

  if (width in MODAL_WIDTH_MAP) {
    return MODAL_WIDTH_MAP[width as keyof typeof MODAL_WIDTH_MAP]
  }

  return width
}

export function ModalSurface({
  title,
  description,
  children,
  width = 'md',
  hideFooter = false,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onClose,
  onCancel,
  onConfirm,
  confirmVariant = 'brand',
  confirmLoading = false,
  confirmDisabled = false,
}: ModalSurfaceProps) {
  const panelStyle: CSSProperties = {
    maxWidth: resolveModalWidth(width),
  }

  const handleCancel = onCancel ?? onClose

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-modal-title"
      aria-describedby={description ? 'cm-modal-description' : undefined}
      className="cm-modal"
      style={panelStyle}
    >
      <header className="cm-modal__header">
        <div className="min-w-0 flex-1">
          <h2 id="cm-modal-title" className="cm-modal__title">{title}</h2>
          {description ? (
            <p id="cm-modal-description" className="cm-modal__description">{description}</p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label="Close modal"
          onClick={onClose}
          className="cm-modal__close"
        >
          <XIcon />
        </Button>
      </header>

      <div className="cm-modal__body">{children}</div>

      {hideFooter ? null : (
        <footer className="cm-modal__footer">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            loading={confirmLoading}
            disabled={confirmDisabled}
          >
            {confirmText}
          </Button>
        </footer>
      )}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = 'md',
  showOverlay = true,
  closeOnOverlayClick = true,
  hideFooter = false,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onCancel,
  onConfirm,
  confirmVariant = 'brand',
  confirmLoading = false,
  confirmDisabled = false,
}: ModalProps) {
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

  return createPortal(
    <div className="cm-modal-shell">
      {showOverlay ? (
        <button
          type="button"
          aria-label="Close modal overlay"
          className={joinClassNames('cm-modal-overlay', !closeOnOverlayClick && 'pointer-events-none')}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
      ) : null}

      <ModalSurface
        title={title}
        description={description}
        width={width}
        hideFooter={hideFooter}
        cancelText={cancelText}
        confirmText={confirmText}
        onClose={onClose}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmVariant={confirmVariant}
        confirmLoading={confirmLoading}
        confirmDisabled={confirmDisabled}
      >
        {children}
      </ModalSurface>
    </div>,
    portalTarget
  )
}
