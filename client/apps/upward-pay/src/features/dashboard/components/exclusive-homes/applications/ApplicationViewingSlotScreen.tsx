'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import type { InspectionWeekday } from '@/features/dashboard/constants/exclusiveHomeApplications'
import {
  getExclusiveHomeApplicationById,
  updateExclusiveHomeApplication,
} from '@/features/dashboard/utils/exclusiveHomeApplications'
import { getExclusiveHomeById } from '@/features/dashboard/utils/exclusiveHomes'

type TimeOption = {
  value: string
  label: string
}

type CalendarCell = {
  value: string
  dayLabel: string
  isCurrentMonth: boolean
  isAvailable: boolean
}

const WEEKDAY_ORDER: InspectionWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateValue(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00`)
}

function getWeekdayFromDate(date: Date): InspectionWeekday {
  return WEEKDAY_ORDER[(date.getDay() + 6) % 7]
}

function formatDateLabel(dateValue: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateValue(dateValue))
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number): string {
  const base = new Date('2026-01-01T00:00:00')
  const output = new Date(base)
  output.setMinutes(minutes)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(output)
}

function getTomorrow(): Date {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setHours(0, 0, 0, 0)
  tomorrow.setDate(now.getDate() + 1)
  return tomorrow
}

function buildTimeOptions(
  slots: Array<{ day: InspectionWeekday; start: string; end: string }>,
  selectedDayWeekday: InspectionWeekday,
): TimeOption[] {
  const seen = new Set<string>()
  const options: TimeOption[] = []
  const daySlots = slots.filter((slot) => slot.day === selectedDayWeekday)

  for (const slot of daySlots) {
    const start = toMinutes(slot.start)
    const end = toMinutes(slot.end)
    for (let current = start; current < end; current += 30) {
      const value = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`
      if (seen.has(value)) continue
      seen.add(value)
      options.push({ value, label: formatTime(current) })
    }
  }

  return options
}

function findFirstAvailableDate(
  allowedDays: Set<InspectionWeekday>,
  slots: Array<{ day: InspectionWeekday; start: string; end: string }>,
): string | undefined {
  const tomorrow = getTomorrow()
  for (let offset = 0; offset <= 90; offset += 1) {
    const date = new Date(tomorrow)
    date.setDate(tomorrow.getDate() + offset)
    const weekday = getWeekdayFromDate(date)
    if (!allowedDays.has(weekday)) continue
    const hasSlot = slots.some((slot) => slot.day === weekday)
    if (!hasSlot) continue
    return formatDateValue(date)
  }
  return undefined
}

function buildCalendarCells(
  viewMonth: Date,
  allowedDays: Set<InspectionWeekday>,
  slots: Array<{ day: InspectionWeekday; start: string; end: string }>,
): CalendarCell[] {
  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const firstWeekdayIndex = (monthStart.getDay() + 6) % 7
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(monthStart.getDate() - firstWeekdayIndex)
  const tomorrow = getTomorrow()

  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + idx)
    const weekday = getWeekdayFromDate(date)
    const hasSlots = slots.some((slot) => slot.day === weekday)
    const notPast = date >= tomorrow
    const isAvailable = allowedDays.has(weekday) && hasSlots && notPast

    return {
      value: formatDateValue(date),
      dayLabel: String(date.getDate()),
      isCurrentMonth: date.getMonth() === viewMonth.getMonth(),
      isAvailable,
    }
  })
}

export function ApplicationViewingSlotScreen({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const application = getExclusiveHomeApplicationById(applicationId)
  const home = application ? getExclusiveHomeById(application.listingId) : undefined
  const backHref = `/dashboard/exclusive-homes/${application?.listingId ?? ''}`

  const allowedWeekdays = application?.inspectionSettings.inspectionTimes.days ?? []
  const slots = application?.inspectionSettings.inspectionTimes.timeSlots ?? []
  const allowedDaySet = useMemo(() => new Set(allowedWeekdays), [allowedWeekdays])
  const firstAvailableDate = useMemo(
    () => findFirstAvailableDate(allowedDaySet, slots),
    [allowedDaySet, slots],
  )

  const initialSelected = firstAvailableDate ?? formatDateValue(getTomorrow())
  const [selectedDate, setSelectedDate] = useState<string>(initialSelected)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined)
  const [monthOffset, setMonthOffset] = useState(0)

  const baseMonth = useMemo(() => {
    const start = parseDateValue(initialSelected)
    return new Date(start.getFullYear(), start.getMonth(), 1)
  }, [initialSelected])

  const viewMonth = useMemo(() => {
    const date = new Date(baseMonth)
    date.setMonth(baseMonth.getMonth() + monthOffset)
    return date
  }, [baseMonth, monthOffset])

  const calendarCells = useMemo(
    () => buildCalendarCells(viewMonth, allowedDaySet, slots),
    [viewMonth, allowedDaySet, slots],
  )

  const selectedWeekday = getWeekdayFromDate(parseDateValue(selectedDate))
  const isSelectedDateAvailable = calendarCells.some(
    (cell) => cell.value === selectedDate && cell.isAvailable,
  )

  const timeOptions = useMemo(() => {
    if (!isSelectedDateAvailable) return []
    return buildTimeOptions(slots, selectedWeekday)
  }, [isSelectedDateAvailable, slots, selectedWeekday])

  useEffect(() => {
    if (timeOptions.length === 0) {
      if (selectedTime !== undefined) setSelectedTime(undefined)
      return
    }
    if (!selectedTime || !timeOptions.some((option) => option.value === selectedTime)) {
      setSelectedTime(timeOptions[0].value)
    }
  }, [timeOptions, selectedTime])

  const selectedDayLabel = formatDateLabel(selectedDate)
  const selectedTimeLabel =
    timeOptions.find((option) => option.value === selectedTime)?.label ?? 'Not selected'

  if (!application || !home) {
    return (
      <PayPageShell title="Inspection time" showBack onBack={() => router.push('/dashboard/exclusive-homes')}>
        <div className="exclusive-homes__empty">
          <h3 className="exclusive-homes__empty-title">Application not found</h3>
          <button
            type="button"
            className="exclusive-homes__secondary-btn home-app__empty-cta"
            onClick={() => router.push('/dashboard/exclusive-homes')}
          >
            Back to listings
          </button>
        </div>
      </PayPageShell>
    )
  }

  const continueToKyc = () => {
    if (!selectedTime || !isSelectedDateAvailable) return

    updateExclusiveHomeApplication(applicationId, {
      viewing: {
        dateLabel: selectedDayLabel,
        timeLabel: selectedTimeLabel,
        address: `${home.area} (full address shared after confirmation)`,
        contactName: 'Upward inspection desk',
        contactPhone: '0800 000 0000',
        notes: 'Arrive 10 minutes early with a valid ID. We will confirm your slot by SMS.',
      },
    })
    router.push(`/dashboard/exclusive-homes/applications/${applicationId}/kyc`)
  }

  return (
    <PayPageShell
      title="Pick inspection slot"
      subtitle="Tap an available day, then choose time instantly"
      showBack
      onBack={() => router.push(backHref)}
      footer={
        <div className="exclusive-homes__detail-actions">
          <button
            type="button"
            className="exclusive-homes__primary-btn"
            onClick={continueToKyc}
            disabled={!selectedTime || !isSelectedDateAvailable}
          >
            Continue to KYC
            <ArrowRight size={17} aria-hidden />
          </button>
          <button
            type="button"
            className="exclusive-homes__secondary-btn exclusive-homes__secondary-btn--full"
            onClick={() => router.push(backHref)}
          >
            Back to listing
          </button>
        </div>
      }
    >
      <div className="app-slot">
        <div className="app-slot__banner">
          <span className="app-slot__star" aria-hidden>
            ✦
          </span>
          <div className="app-slot__banner-copy">
            <p className="app-slot__banner-text">Pick a date first, then choose a time from the dropdown.</p>
          </div>
        </div>

        <section className="app-slot__group">
          <p className="app-slot__label">
            <CalendarDays size={14} aria-hidden />
            Calendar
          </p>

          <div className="app-slot__calendar-head">
            <button
              type="button"
              className="app-slot__calendar-nav"
              onClick={() => setMonthOffset((prev) => Math.max(prev - 1, 0))}
              disabled={monthOffset === 0}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <strong>{formatMonthLabel(viewMonth)}</strong>
            <button
              type="button"
              className="app-slot__calendar-nav"
              onClick={() => setMonthOffset((prev) => Math.min(prev + 1, 2))}
              disabled={monthOffset === 2}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="app-slot__calendar-grid">
            {WEEKDAY_HEADERS.map((day) => (
              <span key={day} className="app-slot__calendar-weekday">
                {day}
              </span>
            ))}
            {calendarCells.map((cell) => (
              <button
                key={cell.value}
                type="button"
                className={`app-slot__calendar-day${
                  cell.isCurrentMonth ? '' : ' app-slot__calendar-day--muted'
                }${cell.isAvailable ? ' app-slot__calendar-day--available' : ' app-slot__calendar-day--blocked'}${
                  selectedDate === cell.value ? ' app-slot__calendar-day--selected' : ''
                }`}
                disabled={!cell.isAvailable}
                onClick={() => {
                  setSelectedDate(cell.value)
                  setSelectedTime(undefined)
                }}
                aria-label={formatDateLabel(cell.value)}
              >
                {cell.dayLabel}
              </button>
            ))}
          </div>

          <p className="app-slot__legend">
            Active dates are available. Blurred dates are unavailable.
          </p>
        </section>

        {isSelectedDateAvailable ? (
          <section className="app-slot__popup">
            <p className="app-slot__popup-title">
              <Clock3 size={14} aria-hidden />
              Choose time for {selectedDayLabel}
            </p>
            <select
              className="app-slot__field app-slot__popup-field"
              value={selectedTime ?? ''}
              onChange={(event) => setSelectedTime(event.target.value || undefined)}
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="app-slot__popup-hint">Pick a slot from the dropdown.</p>
          </section>
        ) : null}

        <div className="app-slot__summary">
          <p className="app-slot__summary-title">Selected slot</p>
          <p className="app-slot__summary-home">{home.name}</p>
          <p className="app-slot__summary-line">
            <CalendarDays size={13} aria-hidden />
            {selectedDayLabel}
          </p>
          <p className="app-slot__summary-line">
            <Clock3 size={13} aria-hidden />
            {selectedTimeLabel}
          </p>
          <p className="app-slot__summary-line">
            <MapPin size={13} aria-hidden />
            {home.area}
          </p>
        </div>
      </div>
    </PayPageShell>
  )
}
