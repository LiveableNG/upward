import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Calendar,
  ChevronDown,
  X,
  RotateCcw,
  Sparkles,
  Check,
  CalendarRange,
} from 'lucide-react'
import type { ExpiryPreset, ExpiryMonthYearRange } from '../types'

export interface ExpiryFilterCounts {
  all: number
  next30: number
  next60: number
  next90: number
  thisYear: number
  nextYear: number
  custom?: number
}

interface TenancyExpiryFilterProps {
  preset: ExpiryPreset
  onPresetChange: (preset: ExpiryPreset) => void
  customRange: ExpiryMonthYearRange | null
  onCustomRangeChange: (range: ExpiryMonthYearRange | null) => void
  counts: ExpiryFilterCounts
  availableYears?: number[]
  previewCount?: (range: ExpiryMonthYearRange) => number
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const TenancyExpiryFilter: React.FC<TenancyExpiryFilterProps> = ({
  preset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  counts,
  availableYears,
  previewCount,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const currentMonth = useMemo(() => new Date().getMonth(), [])

  // Default year list: currentYear - 1 to currentYear + 6
  const yearOptions = useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      const min = Math.min(...availableYears, currentYear - 1)
      const max = Math.max(...availableYears, currentYear + 5)
      const list: number[] = []
      for (let y = min; y <= max; y++) list.push(y)
      return list
    }
    const list: number[] = []
    for (let y = currentYear - 1; y <= currentYear + 6; y++) list.push(y)
    return list
  }, [availableYears, currentYear])

  // Local draft state for popover
  const [draftFromMonth, setDraftFromMonth] = useState<number>(
    customRange ? customRange.fromMonth : currentMonth
  )
  const [draftFromYear, setDraftFromYear] = useState<number>(
    customRange ? customRange.fromYear : currentYear
  )
  const [draftToMonth, setDraftToMonth] = useState<number>(
    customRange ? customRange.toMonth : (currentMonth + 3) % 12
  )
  const [draftToYear, setDraftToYear] = useState<number>(
    customRange
      ? customRange.toYear
      : currentMonth + 3 >= 12
      ? currentYear + 1
      : currentYear
  )

  // Sync draft state when customRange changes or popover opens
  useEffect(() => {
    if (isOpen) {
      if (customRange) {
        setDraftFromMonth(customRange.fromMonth)
        setDraftFromYear(customRange.fromYear)
        setDraftToMonth(customRange.toMonth)
        setDraftToYear(customRange.toYear)
      }
    }
  }, [isOpen, customRange])

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Format active range string
  const activeCustomLabel = useMemo(() => {
    if (preset !== 'custom' || !customRange) return null
    const fromStr = `${MONTH_SHORT[customRange.fromMonth]} ${customRange.fromYear}`
    const toStr = `${MONTH_SHORT[customRange.toMonth]} ${customRange.toYear}`
    if (fromStr === toStr) return fromStr
    return `${fromStr} – ${toStr}`
  }, [preset, customRange])

  // Preview count for draft selection
  const draftLiveCount = useMemo(() => {
    if (!previewCount) return null
    return previewCount({
      fromMonth: draftFromMonth,
      fromYear: draftFromYear,
      toMonth: draftToMonth,
      toYear: draftToYear,
    })
  }, [previewCount, draftFromMonth, draftFromYear, draftToMonth, draftToYear])

  const handleApplyCustom = () => {
    const fromIndex = draftFromYear * 12 + draftFromMonth
    const toIndex = draftToYear * 12 + draftToMonth

    let finalFromMonth = draftFromMonth
    let finalFromYear = draftFromYear
    let finalToMonth = draftToMonth
    let finalToYear = draftToYear

    if (fromIndex > toIndex) {
      finalFromMonth = draftToMonth
      finalFromYear = draftToYear
      finalToMonth = draftFromMonth
      finalToYear = draftFromYear
    }

    onCustomRangeChange({
      fromMonth: finalFromMonth,
      fromYear: finalFromYear,
      toMonth: finalToMonth,
      toYear: finalToYear,
    })
    onPresetChange('custom')
    setIsOpen(false)
  }

  const handleClearCustom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    onCustomRangeChange(null)
    onPresetChange('all')
    setIsOpen(false)
  }

  const applyQuickQuarter = (quarter: 1 | 2 | 3 | 4, year: number) => {
    const startMonth = (quarter - 1) * 3
    const endMonth = startMonth + 2
    setDraftFromMonth(startMonth)
    setDraftFromYear(year)
    setDraftToMonth(endMonth)
    setDraftToYear(year)
  }

  const applyQuickFutureMonths = (monthSpan: number) => {
    const start = new Date()
    const end = new Date()
    end.setMonth(end.getMonth() + monthSpan - 1)

    setDraftFromMonth(start.getMonth())
    setDraftFromYear(start.getFullYear())
    setDraftToMonth(end.getMonth())
    setDraftToYear(end.getFullYear())
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          paddingRight: '6px',
          fontWeight: 600,
        }}
      >
        <Calendar size={14} style={{ color: 'var(--accent)' }} />
        Rent Expiry:
      </span>

      {/* Preset Pills */}
      <button
        type="button"
        onClick={() => {
          onPresetChange('all')
          onCustomRangeChange(null)
        }}
        className={`date-chip ${preset === 'all' && !customRange ? 'active' : ''}`}
      >
        All Expiries ({counts.all})
      </button>

      <button
        type="button"
        onClick={() => {
          onPresetChange('next30')
          onCustomRangeChange(null)
        }}
        className={`date-chip ${preset === 'next30' ? 'active' : ''}`}
      >
        Next 30 Days ({counts.next30})
      </button>

      <button
        type="button"
        onClick={() => {
          onPresetChange('next60')
          onCustomRangeChange(null)
        }}
        className={`date-chip ${preset === 'next60' ? 'active' : ''}`}
      >
        Next 60 Days ({counts.next60})
      </button>

      <button
        type="button"
        onClick={() => {
          onPresetChange('next90')
          onCustomRangeChange(null)
        }}
        className={`date-chip ${preset === 'next90' ? 'active' : ''}`}
      >
        Next 90 Days ({counts.next90})
      </button>

      <button
        type="button"
        onClick={() => {
          onPresetChange('thisYear')
          onCustomRangeChange(null)
        }}
        className={`date-chip ${preset === 'thisYear' ? 'active' : ''}`}
      >
        {currentYear} ({counts.thisYear})
      </button>

      <button
        type="button"
        onClick={() => {
          onPresetChange('nextYear')
          onCustomRangeChange(null)
        }}
        className={`date-chip ${preset === 'nextYear' ? 'active' : ''}`}
      >
        {currentYear + 1} ({counts.nextYear})
      </button>

      {/* Custom Month/Year Range Trigger */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`date-chip ${preset === 'custom' && customRange ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderColor:
              preset === 'custom' || isOpen ? 'var(--accent)' : 'var(--border)',
            background:
              preset === 'custom'
                ? 'var(--accent)'
                : isOpen
                ? 'var(--accent-faint)'
                : 'var(--white)',
            color:
              preset === 'custom'
                ? '#ffffff'
                : isOpen
                ? 'var(--accent)'
                : 'var(--text-muted)',
            boxShadow: isOpen ? '0 0 0 2px var(--accent-faint)' : 'none',
          }}
        >
          <CalendarRange size={13} />
          <span>
            {activeCustomLabel
              ? `${activeCustomLabel} (${counts.custom ?? 0})`
              : 'Month / Year Range'}
          </span>

          {preset === 'custom' && customRange ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearCustom}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClearCustom()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '2px',
                padding: '2px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
              title="Clear custom range"
            >
              <X size={12} />
            </span>
          ) : (
            <ChevronDown
              size={13}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          )}
        </button>

        {/* Popover Dropdown */}
        {isOpen && (
          <div
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 100,
              width: '340px',
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--surface, #ffffff)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.18)',
              padding: '16px',
              animation: 'fadeInSlideDown 0.18s ease-out',
            }}
          >
            {/* Popover Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  Filter by Expiry Range
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* From & To Selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* From Row */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                  }}
                >
                  From Expiry Period
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={draftFromMonth}
                    onChange={(e) => setDraftFromMonth(Number(e.target.value))}
                    className="input"
                    style={{
                      flex: 1,
                      height: '36px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '0 8px',
                      borderRadius: '8px',
                    }}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draftFromYear}
                    onChange={(e) => setDraftFromYear(Number(e.target.value))}
                    className="input"
                    style={{
                      width: '100px',
                      height: '36px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '0 8px',
                      borderRadius: '8px',
                    }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To Row */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                  }}
                >
                  To Expiry Period
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={draftToMonth}
                    onChange={(e) => setDraftToMonth(Number(e.target.value))}
                    className="input"
                    style={{
                      flex: 1,
                      height: '36px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '0 8px',
                      borderRadius: '8px',
                    }}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draftToYear}
                    onChange={(e) => setDraftToYear(Number(e.target.value))}
                    className="input"
                    style={{
                      width: '100px',
                      height: '36px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '0 8px',
                      borderRadius: '8px',
                    }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={12} style={{ color: 'var(--accent)' }} />
                Quick Presets:
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applyQuickQuarter(1, draftFromYear)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Q1 ({draftFromYear})
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickQuarter(2, draftFromYear)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Q2 ({draftFromYear})
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickQuarter(3, draftFromYear)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Q3 ({draftFromYear})
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickQuarter(4, draftFromYear)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Q4 ({draftFromYear})
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFutureMonths(6)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Next 6 Mos
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickFutureMonths(12)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  Next 12 Mos
                </button>
              </div>
            </div>

            {/* Live Matches Preview & Actions */}
            <div
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {draftLiveCount !== null && (
                  <span>
                    Matching:{' '}
                    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>
                      {draftLiveCount}
                    </strong>{' '}
                    tenants
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleClearCustom()}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(217, 119, 87, 0.25)',
                  }}
                >
                  <Check size={13} />
                  Apply Range
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default TenancyExpiryFilter
