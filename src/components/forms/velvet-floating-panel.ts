'use client'

import { useEffect, useRef, useState } from 'react'

type FloatingPosition = {
  top: number
  left: number
  width: number
}

export function useFloatingPanel(open: boolean, onClose: () => void) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  const [position, setPosition] = useState<FloatingPosition | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return

      const nextPosition = {
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      }

      setPosition(current => {
        if (
          current &&
          current.top === nextPosition.top &&
          current.left === nextPosition.left &&
          current.width === nextPosition.width
        ) {
          return current
        }

        return nextPosition
      })
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return

      if (
        anchorRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }

      onCloseRef.current()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return { anchorRef, panelRef, position, setPosition }
}
