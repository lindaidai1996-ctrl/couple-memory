'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRightIcon,
  Button,
  RotateCcwIcon,
  RotateCwIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/ui/button'

export type PhotoViewerItem = {
  id: string
  src: string
  alt: string
  title?: string | null
}

export type PhotoViewerTransformCommand = 'zoom-in' | 'zoom-out' | 'rotate-left' | 'rotate-right'

export type PhotoViewerCopy = {
  close: string
  previous: string
  next: string
  zoomOut: string
  zoomIn: string
  rotateRight: string
  rotateLeft: string
  loading: string
  failed: string
  imageCount: (current: number, total: number) => string
}

export type PhotoViewerAction = {
  key: string
  label: string
  icon: ReactNode
  onSelect: (item: PhotoViewerItem, index: number) => void
  disabled?: boolean
}

type Translator = (key: string, values?: Record<string, string | number>) => string

export function buildPhotoViewerCopy(t: Translator): PhotoViewerCopy {
  return {
    close: t('close'),
    previous: t('previous'),
    next: t('next'),
    zoomOut: t('zoomOut'),
    zoomIn: t('zoomIn'),
    rotateLeft: t('rotateLeft'),
    rotateRight: t('rotateRight'),
    loading: t('loading'),
    failed: t('failed'),
    imageCount: (current, total) => t('imageCount', { current, total }),
  }
}

export function buildPhotoViewerNavigationState({
  currentIndex,
  total,
}: {
  currentIndex: number
  total: number
}) {
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < total - 1

  return {
    hasPrevious,
    hasNext,
    previousIndex: hasPrevious ? currentIndex - 1 : null,
    nextIndex: hasNext ? currentIndex + 1 : null,
  }
}

export function buildPhotoViewerTransform(
  current: { scale: number; rotation: number },
  command: PhotoViewerTransformCommand
) {
  if (command === 'zoom-out') {
    return {
      ...current,
      scale: Math.max(1, Number((current.scale - 0.5).toFixed(2))),
    }
  }

  if (command === 'zoom-in') {
    return {
      ...current,
      scale: Math.min(4, Number((current.scale + 0.5).toFixed(2))),
    }
  }

  if (command === 'rotate-right') {
    return {
      ...current,
      rotation: current.rotation + 90,
    }
  }

  if (command === 'rotate-left') {
    return {
      ...current,
      rotation: current.rotation - 90,
    }
  }

  return current
}

export function buildPhotoViewerToolbarActions({
  copy,
  customActions = [],
}: {
  copy: Pick<PhotoViewerCopy, 'zoomOut' | 'zoomIn' | 'rotateLeft' | 'rotateRight'>
  customActions?: PhotoViewerAction[]
}) {
  return [
    {
      key: 'zoom-out',
      label: copy.zoomOut,
      icon: <ZoomOutIcon />,
    },
    {
      key: 'zoom-in',
      label: copy.zoomIn,
      icon: <ZoomInIcon />,
    },
    {
      key: 'rotate-left',
      label: copy.rotateLeft,
      icon: <RotateCcwIcon />,
    },
    {
      key: 'rotate-right',
      label: copy.rotateRight,
      icon: <RotateCwIcon />,
    },
    ...customActions,
  ]
}

export function PhotoViewer({
  open,
  items,
  currentIndex,
  onIndexChange,
  onClose,
  copy,
  customActions = [],
}: {
  open: boolean
  items: PhotoViewerItem[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
  copy: PhotoViewerCopy
  customActions?: PhotoViewerAction[]
}) {
  const [direction, setDirection] = useState(0)
  const item = items[currentIndex] ?? null

  if (!open || !item) return null

  const content = (
    <PhotoViewerFrame
      key={item.id}
      item={item}
      items={items}
      currentIndex={currentIndex}
      onIndexChange={onIndexChange}
      onClose={onClose}
      copy={copy}
      customActions={customActions}
      direction={direction}
      onDirectionChange={setDirection}
    />
  )

  if (typeof document === 'undefined') {
    return content
  }

  return createPortal(content, document.body)
}

function PhotoViewerFrame({
  item,
  items,
  currentIndex,
  onIndexChange,
  onClose,
  copy,
  customActions,
  direction,
  onDirectionChange,
}: {
  item: PhotoViewerItem
  items: PhotoViewerItem[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
  copy: PhotoViewerCopy
  customActions: PhotoViewerAction[]
  direction: number
  onDirectionChange: (value: number) => void
}) {
  const [transform, setTransform] = useState({ scale: 1, rotation: 0 })
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const navigation = buildPhotoViewerNavigationState({
    currentIndex,
    total: items.length,
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'ArrowLeft' && navigation.previousIndex !== null) {
        event.preventDefault()
        onDirectionChange(-1)
        onIndexChange(navigation.previousIndex)
        return
      }

      if (event.key === 'ArrowRight' && navigation.nextIndex !== null) {
        event.preventDefault()
        onDirectionChange(1)
        onIndexChange(navigation.nextIndex)
        return
      }

      if ((event.key === '+' || event.key === '=') && item) {
        event.preventDefault()
        setTransform(current => buildPhotoViewerTransform(current, 'zoom-in'))
        return
      }

      if (event.key === '-' && item) {
        event.preventDefault()
        setTransform(current => buildPhotoViewerTransform(current, 'zoom-out'))
        return
      }

      if ((event.key === 'r' || event.key === 'R') && item) {
        event.preventDefault()
        setTransform(current => buildPhotoViewerTransform(current, 'rotate-right'))
        return
      }

      if ((event.key === 'l' || event.key === 'L') && item) {
        event.preventDefault()
        setTransform(current => buildPhotoViewerTransform(current, 'rotate-left'))
        return
      }

    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, navigation.nextIndex, navigation.previousIndex, onClose, onDirectionChange, onIndexChange])

  const toolbarActions = useMemo(
    () => buildPhotoViewerToolbarActions({ copy, customActions }),
    [copy, customActions]
  )

  return (
    <div className="cm-photo-viewer" role="dialog" aria-modal="true" aria-label={item.alt}>
      <button type="button" className="cm-photo-viewer__overlay" aria-label={copy.close} onClick={onClose} />

      <div className="cm-photo-viewer__chrome">
        <div className="cm-photo-viewer__topbar">
          <div className="cm-photo-viewer__meta">
            <p className="cm-photo-viewer__title">{item.title || item.alt}</p>
            <p className="cm-photo-viewer__count">{copy.imageCount(currentIndex + 1, items.length)}</p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            variant="ghost"
            size="xs"
            iconOnly
            className="cm-photo-viewer__close"
          >
            <XIcon />
          </Button>
        </div>

        <div className="cm-photo-viewer__stage">
          {navigation.previousIndex !== null ? (
            <button
              type="button"
              className="cm-photo-viewer__nav cm-photo-viewer__nav--left"
              aria-label={copy.previous}
              onClick={() => {
                onDirectionChange(-1)
                onIndexChange(navigation.previousIndex!)
              }}
            >
              <ArrowRightIcon className="-scale-x-100" />
            </button>
          ) : null}

          {navigation.nextIndex !== null ? (
            <button
              type="button"
              className="cm-photo-viewer__nav cm-photo-viewer__nav--right"
              aria-label={copy.next}
              onClick={() => {
                onDirectionChange(1)
                onIndexChange(navigation.nextIndex!)
              }}
            >
              <ArrowRightIcon />
            </button>
          ) : null}

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={item.id}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 56 : -56 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -56 : 56 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="cm-photo-viewer__image-shell"
            >
              {imageState !== 'ready' ? (
                <div
                  className={`cm-photo-viewer__status ${
                    imageState === 'failed' ? 'cm-photo-viewer__status--failed' : 'cm-photo-viewer__loading'
                  }`}
                >
                  {imageState === 'failed' ? copy.failed : (
                    <span className="cm-photo-viewer__loading-spinner" aria-hidden="true" />
                  )}
                </div>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.alt}
                className="cm-photo-viewer__image"
                style={{
                  transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                }}
                onLoad={() => setImageState('ready')}
                onError={() => setImageState('failed')}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="cm-photo-viewer__toolbar">
          {toolbarActions.map(action => {
            const isCommonAction =
              action.key === 'zoom-out' ||
              action.key === 'zoom-in' ||
              action.key === 'rotate-left' ||
              action.key === 'rotate-right'

            return (
              <button
                key={action.key}
                type="button"
                aria-label={action.label}
                className="cm-photo-viewer__tool"
                disabled={isCommonAction ? false : action.disabled}
                onClick={() => {
                  if (isCommonAction) {
                    setTransform(current =>
                      buildPhotoViewerTransform(current, action.key as PhotoViewerTransformCommand)
                    )
                    return
                  }

                  action.onSelect(item, currentIndex)
                }}
              >
                <span className="cm-photo-viewer__tool-icon" aria-hidden="true">
                  {action.icon}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
