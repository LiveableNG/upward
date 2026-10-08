'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle2, Info, Sparkles, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaymentTimingFieldProps {
  /** The ISO date string (YYYY-MM-DD) for when the payment was received */
  paymentDate?: string
  onPaymentDateChange: (date: string) => void
  /** Timeliness evaluation: 'ON_TIME' or 'LATE' */
  timeliness: 'ON_TIME' | 'LATE'
  onTimelinessChange: (timeliness: 'ON_TIME' | 'LATE') => void
  /** The target due date for the rental period (usually rentStartDate or rentDueDate) */
  targetDueDate?: string
  /** Custom section title */
  title?: string
  /** Custom container class */
  className?: string
  /** Compact styling for smaller modals */
  compact?: boolean
}

export const PaymentTimingField: React.FC<PaymentTimingFieldProps> = ({
  paymentDate,
  onPaymentDateChange,
  timeliness,
  onTimelinessChange,
  targetDueDate,
  title = 'Payment Date & Timeliness Evaluation',
  className,
  compact = false,
}) => {
  // If paymentDate is provided, default to EXACT_DATE. Otherwise, default to EXACT_DATE with empty date.
  const [mode, setMode] = useState<'EXACT_DATE' | 'QUICK'>(() => {
    return paymentDate ? 'EXACT_DATE' : 'EXACT_DATE'
  })
  const [manualOverride, setManualOverride] = useState<boolean>(false)

  // Compute difference in calendar days (UTC-safe)
  const diffDays = useMemo(() => {
    if (!paymentDate || !targetDueDate) return null
    const [py, pm, pd] = paymentDate.split('-').map(Number)
    const [dy, dm, dd] = targetDueDate.split('-').map(Number)
    if (!py || !pm || !pd || !dy || !dm || !dd) return null

    const payUtc = Date.UTC(py, pm - 1, pd)
    const dueUtc = Date.UTC(dy, dm - 1, dd)
    return Math.ceil((payUtc - dueUtc) / (1000 * 60 * 60 * 24))
  }, [paymentDate, targetDueDate])

  // Automatically compute and suggest timeliness when paymentDate or targetDueDate changes
  useEffect(() => {
    if (mode === 'EXACT_DATE' && paymentDate && targetDueDate && !manualOverride) {
      if (diffDays !== null) {
        if (diffDays <= 0) {
          if (timeliness !== 'ON_TIME') onTimelinessChange('ON_TIME')
        } else {
          if (timeliness !== 'LATE') onTimelinessChange('LATE')
        }
      }
    }
  }, [mode, paymentDate, targetDueDate, diffDays, manualOverride, timeliness, onTimelinessChange])

  const handleModeSwitch = (newMode: 'EXACT_DATE' | 'QUICK') => {
    setMode(newMode)
    setManualOverride(false)
    if (newMode === 'QUICK') {
      onPaymentDateChange('')
    } else {
      if (!paymentDate) {
        const todayStr = new Date().toISOString().split('T')[0]
        onPaymentDateChange(todayStr)
      }
    }
  }

  const handleDateChange = (newDate: string) => {
    setManualOverride(false)
    onPaymentDateChange(newDate)
  }

  const handleManualOverrideToggle = () => {
    const nextVal = timeliness === 'ON_TIME' ? 'LATE' : 'ON_TIME'
    setManualOverride(true)
    onTimelinessChange(nextVal)
  }

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '-'
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return dateStr
    const date = new Date(Date.UTC(y, m - 1, d))
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  }

  return (
    <div className={cn("apple-payment-timing-card animate-fade-in", className)}>
      <div className="apple-timing-header">
        <div className="apple-timing-title-group">
          <Calendar size={compact ? 13 : 15} className="apple-timing-icon" />
          <span className="apple-timing-title">{title}</span>
        </div>

        {/* Apple Segmented Control */}
        <div className="apple-timing-segmented">
          <button
            type="button"
            className={cn(
              "apple-timing-segment-btn",
              mode === 'EXACT_DATE' && "apple-timing-segment-btn--active"
            )}
            onClick={() => handleModeSwitch('EXACT_DATE')}
          >
            <Calendar size={12} />
            <span>Exact Date</span>
          </button>
          <button
            type="button"
            className={cn(
              "apple-timing-segment-btn",
              mode === 'QUICK' && "apple-timing-segment-btn--active"
            )}
            onClick={() => handleModeSwitch('QUICK')}
          >
            <HelpCircle size={12} />
            <span>Date Unknown</span>
          </button>
        </div>
      </div>

      {mode === 'EXACT_DATE' ? (
        <div className="apple-timing-body animate-fade-in">
          <div className="apple-timing-input-row">
            <div className="apple-timing-field-group">
              <label className="apple-timing-label">
                Actual Payment Date Received
              </label>
              <div className="apple-timing-input-wrap">
                <input
                  type="date"
                  className="apple-timing-date-input"
                  value={paymentDate || ''}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
            </div>

            {targetDueDate && (
              <div className="apple-timing-due-badge">
                <span className="apple-timing-due-label">Rent Period Due Date:</span>
                <span className="apple-timing-due-val">{formatDateDisplay(targetDueDate)}</span>
              </div>
            )}
          </div>

          {/* Automatic Timeliness Result Box */}
          {paymentDate ? (
            <div className={cn(
              "apple-timing-result-box",
              timeliness === 'ON_TIME' ? "apple-timing-result-box--on-time" : "apple-timing-result-box--late"
            )}>
              <div className="apple-timing-result-main">
                <div className="apple-timing-result-icon">
                  {timeliness === 'ON_TIME' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>
                <div className="apple-timing-result-text">
                  <div className="apple-timing-result-heading">
                    {timeliness === 'ON_TIME' ? (
                      <>
                        <span>Evaluated as On-Time</span>
                        {manualOverride && <span className="apple-timing-override-pill">PM Override</span>}
                      </>
                    ) : (
                      <>
                        <span>
                          Evaluated as Late
                          {diffDays !== null && diffDays > 0 ? ` (${diffDays} day${diffDays === 1 ? '' : 's'} past due)` : ''}
                        </span>
                        {manualOverride && <span className="apple-timing-override-pill">PM Override</span>}
                      </>
                    )}
                  </div>
                  <p className="apple-timing-result-desc">
                    {timeliness === 'ON_TIME' ? (
                      diffDays !== null && diffDays <= 0
                        ? `Received on or before due date (${formatDateDisplay(targetDueDate)}). Rewards tenant on-time credit streak.`
                        : `Received on ${formatDateDisplay(paymentDate)}. Tenant builds positive on-time rent score credibility.`
                    ) : (
                      diffDays !== null && diffDays > 0
                        ? `Received ${diffDays} day${diffDays === 1 ? '' : 's'} after due date (${formatDateDisplay(targetDueDate)}). Cycle recorded as late for scoring.`
                        : `Payment recorded past due. The initial cycle will reflect late for scoring.`
                    )}
                  </p>
                </div>
              </div>

              {/* Grace Period / Override Action */}
              <button
                type="button"
                className="apple-timing-override-btn"
                onClick={handleManualOverrideToggle}
                title="Click to toggle evaluation if there is an agreed PM grace period or exception"
              >
                {timeliness === 'ON_TIME' ? 'Mark as Late' : 'Grant Grace Period (Mark On-Time)'}
              </button>
            </div>
          ) : (
            <div className="apple-timing-hint-box">
              <Info size={13} />
              <span>Select the calendar date when the funds were received to auto-evaluate timeliness.</span>
            </div>
          )}
        </div>
      ) : (
        /* Date Unknown / Quick Select Mode */
        <div className="apple-timing-body animate-fade-in">
          <div className="apple-timeliness-grid">
            <button
              type="button"
              className={cn(
                "apple-timeliness-btn",
                timeliness === 'ON_TIME' && "apple-timeliness-btn--on-time"
              )}
              onClick={() => onTimelinessChange('ON_TIME')}
            >
              <Clock size={14} />
              <span>On-Time Payment</span>
            </button>
            <button
              type="button"
              className={cn(
                "apple-timeliness-btn",
                timeliness === 'LATE' && "apple-timeliness-btn--late"
              )}
              onClick={() => onTimelinessChange('LATE')}
            >
              <AlertTriangle size={14} />
              <span>Late Payment</span>
            </button>
          </div>
          <p className="apple-timeliness-hint">
            {timeliness === 'ON_TIME'
              ? 'Exact date unknown. Evaluating as On-Time builds the tenant’s on-time rent score credibility.'
              : 'Exact date unknown. Evaluating as Late records this initial cycle as past due for scoring.'}
          </p>
        </div>
      )}

      <style jsx>{`
        .apple-payment-timing-card {
          margin-top: 12px;
          padding: 12px 14px;
          background: #ffffff;
          border-radius: var(--radius-md, 12px);
          border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
        }

        .apple-timing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .apple-timing-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .apple-timing-icon {
          color: var(--clay, #9e5b3f);
        }

        .apple-timing-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--dark, #1c1c1c);
          letter-spacing: -0.1px;
        }

        .apple-timing-segmented {
          display: inline-flex;
          background: var(--ivory-dim, #f5f4f0);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;
          border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
        }

        .apple-timing-segment-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted, #71717a);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .apple-timing-segment-btn:hover {
          color: var(--dark, #1c1c1c);
        }

        .apple-timing-segment-btn--active {
          background: #ffffff;
          color: var(--dark, #1c1c1c);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .apple-timing-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .apple-timing-input-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .apple-timing-field-group {
          flex: 1 1 200px;
          min-width: 0;
        }

        .apple-timing-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted, #71717a);
          margin-bottom: 4px;
        }

        .apple-timing-input-wrap {
          position: relative;
        }

        .apple-timing-date-input {
          width: 100%;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid var(--border, rgba(0, 0, 0, 0.12));
          background: var(--bg, #fbfbfa);
          color: var(--dark, #1c1c1c);
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .apple-timing-date-input:focus {
          border-color: var(--clay, #9e5b3f);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(158, 91, 63, 0.12);
        }

        .apple-timing-due-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: 6px 10px;
          background: var(--ivory-dim, #f7f6f2);
          border-radius: var(--radius-sm, 8px);
          border: 1px dashed var(--border, rgba(0, 0, 0, 0.12));
          font-size: 10px;
        }

        .apple-timing-due-label {
          color: var(--text-muted, #71717a);
          font-weight: 500;
        }

        .apple-timing-due-val {
          color: var(--dark, #1c1c1c);
          font-weight: 700;
          margin-top: 1px;
        }

        .apple-timing-result-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-sm, 8px);
          transition: all 0.2s ease;
          flex-wrap: wrap;
        }

        .apple-timing-result-box--on-time {
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: var(--forest, #15803d);
        }

        .apple-timing-result-box--late {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.28);
          color: #b45309;
        }

        .apple-timing-result-main {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex: 1 1 240px;
        }

        .apple-timing-result-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .apple-timing-result-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .apple-timing-result-heading {
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .apple-timing-override-pill {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 1px 5px;
          background: #ffffff;
          border-radius: 4px;
          border: 1px solid currentColor;
          opacity: 0.85;
        }

        .apple-timing-result-desc {
          margin: 0;
          font-size: 11px;
          opacity: 0.9;
          line-height: 1.35;
          color: var(--text-muted, #52525b);
        }

        .apple-timing-override-btn {
          background: transparent;
          border: 1px solid currentColor;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 600;
          padding: 4px 8px;
          cursor: pointer;
          opacity: 0.85;
          transition: all 0.15s ease;
          align-self: center;
          color: inherit;
        }

        .apple-timing-override-btn:hover {
          opacity: 1;
          background: #ffffff;
        }

        .apple-timing-hint-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: var(--ivory-dim, #f9f8f5);
          border-radius: 6px;
          font-size: 11px;
          color: var(--text-muted, #71717a);
        }

        .apple-timeliness-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .apple-timeliness-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid var(--border, rgba(0, 0, 0, 0.08));
          background: var(--ivory-dim, #fbfbfa);
          color: var(--text-muted, #666);
          transition: all 0.2s ease;
        }

        .apple-timeliness-btn:hover {
          border-color: var(--dark, #111);
          color: var(--dark, #111);
          background: #ffffff;
        }

        .apple-timeliness-btn--on-time {
          background: var(--forest-faint, rgba(34, 197, 94, 0.1)) !important;
          border-color: var(--forest, #22c55e) !important;
          color: var(--forest, #15803d) !important;
        }

        .apple-timeliness-btn--late {
          background: rgba(245, 158, 11, 0.1) !important;
          border-color: #f59e0b !important;
          color: #b45309 !important;
        }

        .apple-timeliness-hint {
          font-size: 11px;
          color: var(--text-muted, #777);
          margin: 4px 0 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}
