'use client'

import type { CSSProperties } from 'react'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'

import { buttonClassName } from '@/components/ui/button'
import { useFloatingPanel } from '@/components/forms/velvet-floating-panel'

const VELVET_FLOATING_PANEL_Z_INDEX = 140

export type VelvetSelectOption = {
  description?: string
  value: string
  label: string
}

type VelvetSelectProps = {
  ariaLabel?: string
  disabled?: boolean
  fullWidth?: boolean
  name?: string
  onChange: (value: string) => void
  options: VelvetSelectOption[]
  placeholder?: string
  value: string
}

export function buildVelvetSelectAnchorClassName({
  fullWidth = false,
}: {
  fullWidth?: boolean
} = {}) {
  return fullWidth ? 'relative w-full' : 'relative inline-block'
}

export function buildVelvetSelectControlClassName({
  fullWidth = false,
}: {
  fullWidth?: boolean
} = {}) {
  return buttonClassName({
    variant: 'secondary',
    fullWidth,
    className: `group justify-between rounded-[16px] px-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]
      dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`,
  })
}

export function buildVelvetSelectPanelStyle(position: {
  top: number
  left: number
  width: number
}): CSSProperties {
  return {
    position: 'fixed',
    top: position.top,
    left: position.left,
    width: 'max-content',
    minWidth: position.width,
    maxWidth: 'calc(100vw - 1rem)',
    zIndex: VELVET_FLOATING_PANEL_Z_INDEX,
  }
}

export function VelvetSelect({
  ariaLabel,
  disabled = false,
  fullWidth = false,
  name,
  onChange,
  options,
  placeholder = 'Select an option',
  value,
}: VelvetSelectProps) {
  const [open, setOpen] = useState(false)
  const listboxId = useId()
  const { anchorRef, panelRef, position } = useFloatingPanel(open, () => setOpen(false))

  const selectedOption = options.find(option => option.value === value) ?? null

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div ref={anchorRef} className={buildVelvetSelectAnchorClassName({ fullWidth })}>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={disabled}
          className={buildVelvetSelectControlClassName({ fullWidth })}
          onClick={() => setOpen(current => !current)}
        >
          <span className="flex min-w-0 flex-1 flex-col items-start text-left">
            <span className={`${selectedOption ? 'text-[var(--color-warm-text)]' : 'text-[var(--dashboard-text-faint)]'} w-full truncate`}>
              {selectedOption?.label ?? placeholder}
            </span>
            {selectedOption?.description ? (
              <span className="mt-1 w-full truncate text-[11px] leading-4 text-[var(--dashboard-text-faint)]">
                {selectedOption.description}
              </span>
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className={`text-[11px] text-[var(--dashboard-text-faint)] transition duration-200 ${open ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>
      </div>
      {typeof document !== 'undefined' && open && position ? createPortal(
        <div
          ref={panelRef}
          id={listboxId}
          role="listbox"
          style={buildVelvetSelectPanelStyle(position)}
          className="velvet-select-panel overflow-hidden rounded-[20px] p-2"
        >
          <div className="grid gap-1">
            {options.map(option => {
              const selected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`${buttonClassName({
                    size: 'sm',
                    variant: selected ? 'subtle' : 'ghost',
                    className: 'flex min-h-[38px] items-start justify-between rounded-[14px] px-3 py-2 text-left text-sm',
                  })} ${
                    selected
                      ? 'velvet-select-option-selected'
                      : 'velvet-select-option-hoverable border border-transparent text-[var(--color-warm-text)]'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className={`mt-1 truncate text-[11px] leading-4 ${
                        selected ? 'text-white/82 dark:text-[#fff7fb]/82' : 'text-[var(--dashboard-text-faint)]'
                      }`}>
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <span className="ml-3 pt-0.5 text-xs text-white/82 dark:text-[#fff7fb]/82">✓</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  )
}
