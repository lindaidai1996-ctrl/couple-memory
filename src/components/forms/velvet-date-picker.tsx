'use client'

import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { buttonClassName } from '@/components/ui/button'
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
  shiftYear,
} from '@/lib/velvet-date'

const VELVET_FLOATING_PANEL_Z_INDEX = 140

type VelvetDatePickerProps = {
  ariaLabel?: string
  defaultValue?: string
  disabled?: boolean
  fullWidth?: boolean
  locale?: string
  name?: string
  onChange?: (value: string) => void
  placeholder?: string
  value?: string
}

export function buildVelvetDatePickerAnchorClassName({
  fullWidth = false,
}: {
  fullWidth?: boolean
} = {}) {
  return fullWidth ? 'relative w-full' : 'relative inline-block'
}

export function buildVelvetDatePickerControlClassName({
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

export function VelvetDatePicker({
  ariaLabel,
  defaultValue = '',
  disabled = false,
  fullWidth = false,
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
  const previousYearLabel = locale.startsWith('zh') ? '上一年' : 'Previous year'
  const nextYearLabel = locale.startsWith('zh') ? '下一年' : 'Next year'
  const previousMonthLabel = locale.startsWith('zh') ? '上个月' : 'Previous month'
  const nextMonthLabel = locale.startsWith('zh') ? '下个月' : 'Next month'

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
      <div ref={anchorRef} className={buildVelvetDatePickerAnchorClassName({ fullWidth })}>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={listboxId}
          disabled={disabled}
          className={buildVelvetDatePickerControlClassName({ fullWidth })}
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
            zIndex: VELVET_FLOATING_PANEL_Z_INDEX,
          }}
          className="velvet-date-panel overflow-hidden rounded-[22px]"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-warm-border)]/80 px-4 py-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={previousYearLabel}
                title={previousYearLabel}
                className={buttonClassName({
                  size: 'xs',
                  iconOnly: true,
                  variant: 'secondary',
                  className: 'velvet-date-nav-button grid h-8 w-8 place-items-center rounded-[10px]',
                })}
                onClick={() => setViewMonth(current => shiftYear(current.year, current.monthIndex, -1))}
              >
                «
              </button>
              <button
                type="button"
                aria-label={previousMonthLabel}
                title={previousMonthLabel}
                className={buttonClassName({
                  size: 'xs',
                  iconOnly: true,
                  variant: 'secondary',
                  className: 'velvet-date-nav-button grid h-8 w-8 place-items-center rounded-[10px]',
                })}
                onClick={() => setViewMonth(current => shiftMonth(current.year, current.monthIndex, -1))}
              >
                ‹
              </button>
            </div>
            <div className="text-sm font-medium text-[var(--color-warm-text)]">
              {getMonthLabel(viewMonth.year, viewMonth.monthIndex, locale)}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={nextMonthLabel}
                title={nextMonthLabel}
                className={buttonClassName({
                  size: 'xs',
                  iconOnly: true,
                  variant: 'secondary',
                  className: 'velvet-date-nav-button grid h-8 w-8 place-items-center rounded-[10px]',
                })}
                onClick={() => setViewMonth(current => shiftMonth(current.year, current.monthIndex, 1))}
              >
                ›
              </button>
              <button
                type="button"
                aria-label={nextYearLabel}
                title={nextYearLabel}
                className={buttonClassName({
                  size: 'xs',
                  iconOnly: true,
                  variant: 'secondary',
                  className: 'velvet-date-nav-button grid h-8 w-8 place-items-center rounded-[10px]',
                })}
                onClick={() => setViewMonth(current => shiftYear(current.year, current.monthIndex, 1))}
              >
                »
              </button>
            </div>
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
                  className={`${buttonClassName({
                    size: 'sm',
                    variant: 'ghost',
                    className: 'grid h-9 place-items-center rounded-[12px] px-0',
                  })} ${
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
              className={buttonClassName({
                size: 'xs',
                variant: 'ghost',
                className: 'h-auto px-0 text-xs uppercase tracking-[0.18em] text-[var(--color-warm-muted)]',
              })}
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
              className={buttonClassName({
                size: 'xs',
                variant: 'ghost',
                className: 'h-auto px-0 text-xs uppercase tracking-[0.18em] text-[var(--color-warm-muted)]',
              })}
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
