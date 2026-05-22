'use client'

import { useId, useState } from 'react'
import { createPortal } from 'react-dom'

import { useFloatingPanel } from '@/components/forms/velvet-floating-panel'

export type VelvetSelectOption = {
  value: string
  label: string
}

type VelvetSelectProps = {
  ariaLabel?: string
  disabled?: boolean
  name?: string
  onChange: (value: string) => void
  options: VelvetSelectOption[]
  placeholder?: string
  value: string
}

const controlClassName = `group flex h-10 w-full items-center justify-between rounded-[16px] border
  border-[var(--color-warm-border)] bg-[var(--color-warm-surface)] px-3.5 text-left text-sm text-[var(--color-warm-text)]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] outline-none transition duration-200
  hover:border-[rgba(111,79,102,0.28)] focus-visible:border-[rgba(111,79,102,0.42)]
  focus-visible:ring-4 focus-visible:ring-[rgba(111,79,102,0.12)] disabled:cursor-not-allowed disabled:opacity-50
  dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`

export function VelvetSelect({
  ariaLabel,
  disabled = false,
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
      <div ref={anchorRef} className="relative">
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={disabled}
          className={controlClassName}
          onClick={() => setOpen(current => !current)}
        >
          <span className={selectedOption ? 'text-[var(--color-warm-text)]' : 'text-[var(--dashboard-text-faint)]'}>
            {selectedOption?.label ?? placeholder}
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
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 80,
          }}
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
                  className={`flex min-h-[38px] items-center justify-between rounded-[14px] px-3 text-sm transition duration-150 ${
                    selected
                      ? 'velvet-select-option-selected'
                      : 'velvet-select-option-hoverable border border-transparent text-[var(--color-warm-text)]'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span>{option.label}</span>
                  {selected ? (
                    <span className="text-xs text-white/82 dark:text-[#fff7fb]/82">✓</span>
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
