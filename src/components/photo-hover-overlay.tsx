import type { ReactNode } from 'react'

export function buildPhotoHoverOverlayClassName() {
  return [
    'cm-photo-hover-overlay',
    'pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-0 transition duration-200',
    'group-hover:opacity-100 group-focus-within:opacity-100',
  ].join(' ')
}

export function buildPhotoHoverMaskClassName(position: 'top' | 'bottom') {
  return [
    `cm-photo-hover-mask cm-photo-hover-mask--${position}`,
    'absolute inset-x-0 transition duration-200',
    position === 'top'
      ? 'top-0 h-[42%] bg-gradient-to-b from-[rgba(17,12,16,0.54)] via-[rgba(17,12,16,0.18)] to-transparent'
      : 'bottom-0 h-[48%] bg-gradient-to-t from-[rgba(17,12,16,0.62)] via-[rgba(17,12,16,0.18)] to-transparent',
  ].join(' ')
}

export function buildPhotoHoverActionButtonClassName() {
  return [
    'cm-photo-hover-action',
    'pointer-events-auto inline-flex h-5 w-5 cursor-pointer items-center justify-center p-0 text-white/88 opacity-72',
    'transition duration-200 hover:text-white hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-45',
  ].join(' ')
}

export function PhotoHoverOverlay({
  topSlot,
  bottomSlot,
}: {
  topSlot?: ReactNode
  bottomSlot?: ReactNode
}) {
  return (
    <div className={buildPhotoHoverOverlayClassName()}>
      <div className={buildPhotoHoverMaskClassName('top')} />
      <div className={buildPhotoHoverMaskClassName('bottom')} />
      {topSlot ? (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {topSlot}
        </div>
      ) : null}
      {bottomSlot ? (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-end p-2.5">
          {bottomSlot}
        </div>
      ) : null}
    </div>
  )
}
