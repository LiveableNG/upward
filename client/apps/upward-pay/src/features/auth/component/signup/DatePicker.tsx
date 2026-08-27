'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'

interface DatePickerProps {
  value: string           // ISO: 'YYYY-MM-DD' or ''
  onChange: (iso: string) => void
  id?: string
  required?: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month: number, year: number) {
  if (!month) return 31
  return new Date(year || 2000, month, 0).getDate()
}

export function DatePicker({ value, onChange, id, required }: DatePickerProps) {
  const [localYear, setLocalYear] = React.useState('')
  const [localMonth, setLocalMonth] = React.useState('')
  const [localDay, setLocalDay] = React.useState('')

  const localIso = (localYear && localMonth && localDay)
    ? `${localYear}-${localMonth.padStart(2, '0')}-${localDay.padStart(2, '0')}`
    : ''

  React.useEffect(() => {
    if (value !== localIso) {
      const parts = value ? value.split('-') : []
      setLocalYear(parts[0] || '')
      setLocalMonth(parts[1] ? String(Number(parts[1])) : '')
      setLocalDay(parts[2] ? String(Number(parts[2])) : '')
    }
  }, [value, localIso])

  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 100
  const maxYear = currentYear - 10  // must be at least 10

  const numDays = daysInMonth(Number(localMonth), Number(localYear))
  const days = Array.from({ length: numDays }, (_, i) => i + 1)
  const months = MONTHS.map((m, i) => ({ label: m, value: i + 1 }))
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)

  const emit = (y: string, m: string, d: string) => {
    if (y && m && d) {
      const mm = m.padStart(2, '0')
      const dd = d.padStart(2, '0')
      onChange(`${y}-${mm}-${dd}`)
    } else {
      onChange('')
    }
  }

  const handleDay = (v: string) => {
    setLocalDay(v)
    emit(localYear, localMonth, v)
  }

  const handleMonth = (v: string) => {
    setLocalMonth(v)
    // If day would exceed new month's days, clamp it
    const maxD = daysInMonth(Number(v), Number(localYear))
    const clampedDay = localDay && Number(localDay) > maxD ? String(maxD) : localDay
    if (clampedDay !== localDay) {
      setLocalDay(clampedDay)
    }
    emit(localYear, v, clampedDay)
  }

  const handleYear = (v: string) => {
    setLocalYear(v)
    const maxD = daysInMonth(Number(localMonth), Number(v))
    const clampedDay = localDay && Number(localDay) > maxD ? String(maxD) : localDay
    if (clampedDay !== localDay) {
      setLocalDay(clampedDay)
    }
    emit(v, localMonth, clampedDay)
  }

  return (
    <div className="dob-picker" id={id}>
      {/* Day */}
      <div className="dob-picker__field dob-picker__field--day">
        <div className="dob-select-wrap">
          <select
            className={`dob-select ${localDay ? 'has-value' : ''}`}
            value={localDay}
            onChange={e => handleDay(e.target.value)}
            required={required}
            aria-label="Day"
          >
            <option value="" disabled>Day</option>
            {days.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown size={14} className="dob-select__chevron" />
        </div>
      </div>

      {/* Month */}
      <div className="dob-picker__field dob-picker__field--month">
        <div className="dob-select-wrap">
          <select
            className={`dob-select ${localMonth ? 'has-value' : ''}`}
            value={localMonth}
            onChange={e => handleMonth(e.target.value)}
            required={required}
            aria-label="Month"
          >
            <option value="" disabled>Month</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="dob-select__chevron" />
        </div>
      </div>

      {/* Year */}
      <div className="dob-picker__field dob-picker__field--year">
        <div className="dob-select-wrap">
          <select
            className={`dob-select ${localYear ? 'has-value' : ''}`}
            value={localYear}
            onChange={e => handleYear(e.target.value)}
            required={required}
            aria-label="Year"
          >
            <option value="" disabled>Year</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown size={14} className="dob-select__chevron" />
        </div>
      </div>

      <style jsx>{`
        .dob-picker {
          display: flex;
          gap: 8px;
          width: 100%;
        }
        .dob-picker__field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .dob-picker__field--day {
          flex: 1;
        }
        .dob-picker__field--month {
          flex: 1.35;
        }
        .dob-picker__field--year {
          flex: 1.25;
        }
        .dob-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          min-width: 0;
        }
        .dob-select {
          width: 100%;
          height: 48px;
          padding: 0 24px 0 10px;
          border: 1.5px solid var(--border-solid);
          border-radius: 12px;
          background: var(--surface);
          color: var(--text-muted);
          font-size: 14px;
          font-family: inherit;
          font-weight: 500;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, color 0.2s;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
        .dob-select.has-value {
          color: var(--text);
        }
        .dob-select:focus {
          border-color: var(--clay);
          box-shadow: 0 0 0 3px rgba(var(--clay-rgb, 180, 120, 80), 0.12);
        }
        .dob-select:hover:not(:focus) {
          border-color: var(--text-muted);
        }
        .dob-select__chevron {
          position: absolute;
          right: 8px;
          color: var(--text-muted);
          pointer-events: none;
          flex-shrink: 0;
        }
        @media (max-width: 380px) {
          .dob-picker {
            gap: 6px;
          }
          .dob-select {
            padding: 0 20px 0 8px;
            font-size: 13px;
          }
          .dob-select__chevron {
            right: 6px;
          }
        }
      `}</style>
    </div>
  )
}
