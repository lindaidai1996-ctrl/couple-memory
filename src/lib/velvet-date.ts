export type CalendarDay = {
  iso: string
  dayOfMonth: number
  inCurrentMonth: boolean
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function buildIsoDate(year: number, monthIndex: number, dayOfMonth: number) {
  return `${year}-${padDatePart(monthIndex + 1)}-${padDatePart(dayOfMonth)}`
}

export function parseIsoDate(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const dayOfMonth = Number(match[3])
  const date = new Date(year, monthIndex, dayOfMonth)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== dayOfMonth
  ) {
    return null
  }

  return { year, monthIndex, dayOfMonth }
}

export function normalizeIsoDate(value: string | null | undefined) {
  const parsed = parseIsoDate(value)
  if (!parsed) return ''
  return buildIsoDate(parsed.year, parsed.monthIndex, parsed.dayOfMonth)
}

export function getTodayIsoDate() {
  const today = new Date()
  return buildIsoDate(today.getFullYear(), today.getMonth(), today.getDate())
}

export function formatDateForDisplay(value: string | null | undefined, locale: string) {
  const parsed = parseIsoDate(value)
  if (!parsed) return ''

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(parsed.year, parsed.monthIndex, parsed.dayOfMonth))
}

export function getMonthLabel(year: number, monthIndex: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, monthIndex, 1))
}

export function shiftMonth(year: number, monthIndex: number, offset: number) {
  const shifted = new Date(year, monthIndex + offset, 1)
  return {
    year: shifted.getFullYear(),
    monthIndex: shifted.getMonth(),
  }
}

export function shiftYear(year: number, monthIndex: number, offset: number) {
  return {
    year: year + offset,
    monthIndex,
  }
}

export function getWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const start = new Date(2024, 0, 7)

  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(start.getTime() + index * MS_PER_DAY))
  )
}

export function buildCalendarMonth(year: number, monthIndex: number): CalendarDay[] {
  const firstDay = new Date(year, monthIndex, 1)
  const leadingDays = firstDay.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPreviousMonth = new Date(year, monthIndex, 0).getDate()
  const totalVisibleDays = 42
  const days: CalendarDay[] = []

  for (let index = 0; index < totalVisibleDays; index += 1) {
    const dayOffset = index - leadingDays + 1

    if (dayOffset <= 0) {
      const previousMonth = shiftMonth(year, monthIndex, -1)
      const dayOfMonth = daysInPreviousMonth + dayOffset
      days.push({
        iso: buildIsoDate(previousMonth.year, previousMonth.monthIndex, dayOfMonth),
        dayOfMonth,
        inCurrentMonth: false,
      })
      continue
    }

    if (dayOffset > daysInMonth) {
      const nextMonth = shiftMonth(year, monthIndex, 1)
      const dayOfMonth = dayOffset - daysInMonth
      days.push({
        iso: buildIsoDate(nextMonth.year, nextMonth.monthIndex, dayOfMonth),
        dayOfMonth,
        inCurrentMonth: false,
      })
      continue
    }

    days.push({
      iso: buildIsoDate(year, monthIndex, dayOffset),
      dayOfMonth: dayOffset,
      inCurrentMonth: true,
    })
  }

  return days
}
