'use client'

import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useFloatingPanel } from '@/components/forms/velvet-floating-panel'
import {
  buildCalendarMonth,
  formatDateForDisplay,
  getMonthLabel,
  getTodayIsoDate,
  getWeekdayLabels,
  normalizeIsoDate,
  parseIsoDate,
  shiftMonth,
} from '@/lib/velvet-date'

type VelvetDatePickerProps = {
  ariaLabel?: string
  defaultValue?: string
  disabled?: boolean
  locale?: string
  name?: string
  onChange?: (value: string) => void
  placeholder?: string
  value?: string
}

const controlClassName = `group flex h-10 w-full items-center justify-between rounded-[16px] border
  border-[var(--color-warm-border)] bg-[var(--color-warm-surface)] px-3.5 text-left text-sm text-[var(--color-warm-text)]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] outline-none transition duration-200
  hover:border-[rgba(111,79,102,0.28)] focus-visible:border-[rgba(111,79,102,0.42)]
  focus-visible:ring-4 focus-visible:ring-[rgba(111,79,102,0.12)] disabled:cursor-not-allowed disabled:opacity-50
  dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`

export function VelvetDatePicker({
  ariaLabel,
  defaultValue = '',
  disabled = false,
  locale = 'zh-CN',
  name,
  onChange,
  placeholder = 'Select date',
  value,
}: VelvetDatePickerProps) {
  const controlled = value !== undefined
  const [internalValue, setInternalValue] = useState(() => normalizeIsoDate(defaultValue))
  const normalizedValue = controlled ? normalizeIsoDate(value) : internalValue
  const selectedDate = parseIsoDate(normalizedValue)
  const todayIso = getTodayIsoDate()
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      return { year: selectedDate.year, monthIndex: selectedDate.monthIndex }
    }

    const today = parseIsoDate(todayIso)!
    return { year: today.year, monthIndex: today.monthIndex }
  })
  const { anchorRef, panelRef, position } = useFloatingPanel(open, () => setOpen(false))

  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale])
  const days = useMemo(
    () => buildCalendarMonth(viewMonth.year, viewMonth.monthIndex),
    [viewMonth.monthIndex, viewMonth.year]
  )
  const todayLabel = locale.startsWith('zh') ? '今天' : 'Today'
  const closeLabel = locale.startsWith('zh') ? '关闭' : 'Close'

  function commitValue(nextValue: string) {
    if (!controlled) {
      setInternalValue(nextValue)
    }
    onChange?.(nextValue)
  }

  function handleToggleOpen() {
    setOpen(current => {
      const nextOpen = !current
      if (nextOpen) {
        if (selectedDate) {
          setViewMonth({ year: selectedDate.year, monthIndex: selectedDate.monthIndex })
        } else {
          const today = parseIsoDate(todayIso)!
          setViewMonth({ year: today.year, monthIndex: today.monthIndex })
        }
      }
      return nextOpen
    })
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={normalizedValue} /> : null}
      <div ref={anchorRef} className="relative">
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={listboxId}
          disabled={disabled}
          className={controlClassName}
          onClick={handleToggleOpen}
        >
          <span className={normalizedValue ? 'text-[var(--color-warm-text)]' : 'text-[var(--dashboard-text-faint)]'}>
            {normalizedValue ? formatDateForDisplay(normalizedValue, locale) : placeholder}
          </span>
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-[10px] border border-[rgba(111,79,102,0.12)]
              bg-[var(--dashboard-surface-gradient)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-warm-accent)]"
          >
            Cal
          </span>
        </button>
      </div>
      {typeof document !== 'undefined' && open && position ? createPortal(
        <div
          ref={panelRef}
          id={listboxId}
          role="dialog"
          aria-modal="false"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: Math.max(position.width, 320),
            zIndex: 80,
          }}
          className="velvet-date-panel overflow-hidden rounded-[22px]"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-warm-border)]/80 px-4 py-3">
            <button
              type="button"
              className="velvet-date-nav-button grid h-8 w-8 place-items-center rounded-[10px]
                transition hover:-translate-y-px hover:border-[rgba(111,79,102,0.18)]"
              onClick={() => setViewMonth(current => shiftMonth(current.year, current.monthIndex, -1))}
            >
              ‹
            </button>
            <div className="text-sm font-medium text-[var(--color-warm-text)]">
              {getMonthLabel(viewMonth.year, viewMonth.monthIndex, locale)}
            </div>
            <button
              type="button"
              className="velvet-date-nav-button grid h-8 w-8 place-items-center rounded-[10px]
                transition hover:-translate-y-px hover:border-[rgba(111,79,102,0.18)]"
              onClick={() => setViewMonth(current => shiftMonth(current.year, current.monthIndex, 1))}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 px-4 pb-2 pt-3">
            {weekdayLabels.map(label => (
              <div
                key={label}
                className="pb-1 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--dashboard-text-faint)]"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {days.map(day => {
              const selected = day.iso === normalizedValue
              const isToday = day.iso === todayIso

              return (
                <button
                  key={day.iso}
                  type="button"
                  className={`grid h-9 place-items-center rounded-[12px] border text-sm transition duration-150 ${
                    selected
                      ? 'velvet-date-day-selected'
                      : isToday
                        ? 'border-[rgba(111,79,102,0.28)] bg-transparent text-[var(--color-warm-accent)]'
                        : day.inCurrentMonth
                          ? 'velvet-date-day-hoverable border-transparent bg-transparent text-[var(--color-warm-text)]'
                          : 'velvet-date-day-hoverable border-transparent bg-transparent text-[var(--dashboard-text-faint)]'
                  }`}
                  onClick={() => {
                    commitValue(day.iso)
                    setOpen(false)
                  }}
                >
                  {day.dayOfMonth}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--color-warm-border)]/80 px-4 py-3">
            <button
              type="button"
              className="text-xs uppercase tracking-[0.18em] text-[var(--color-warm-muted)] transition hover:text-[var(--color-warm-accent)]"
              onClick={() => {
                commitValue(todayIso)
                setViewMonth(() => {
                  const today = parseIsoDate(todayIso)!
                  return { year: today.year, monthIndex: today.monthIndex }
                })
                setOpen(false)
              }}
            >
              {todayLabel}
            </button>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.18em] text-[var(--color-warm-muted)] transition hover:text-[var(--color-warm-accent)]"
              onClick={() => setOpen(false)}
            >
              {closeLabel}
            </button>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  )
}
