'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Wallet,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sliders,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export interface LineItemForDeposit {
  id: number
  name: string
  totalAmount: number
  amountPaid: number
  remaining: number
}

interface RentDepositApplicationCardProps {
  paymentRequestUuid: string
  propertyUuid?: string
  totalOwed: number
  currency?: string
  lineItems?: LineItemForDeposit[]
  canPayPartial?: boolean
  onDepositApplied?: (
    appliedAmount: number,
    allocations?: Array<{ lineItemId: number; amount: number }>,
  ) => void
  onSettledSuccess?: (isFullSettlement?: boolean) => void
}

export function RentDepositApplicationCard({
  paymentRequestUuid,
  propertyUuid,
  totalOwed,
  currency = 'NGN',
  lineItems = [],
  canPayPartial = true,
  onDepositApplied,
  onSettledSuccess,
}: RentDepositApplicationCardProps) {
  const queryClient = useQueryClient()

  // Fetch tenant deposit balance for this property
  const { data: summary, isLoading } = useQuery({
    queryKey: ['rent-deposit-summary', propertyUuid],
    queryFn: () => api.getRentDepositSummary(propertyUuid),
    staleTime: 1000 * 30, // 30 seconds
  })

  const depositBalance: number = useMemo(() => {
    if (!summary) return 0
    if (typeof summary.propertyBalance === 'number' && summary.propertyBalance > 0) {
      return summary.propertyBalance
    }
    return summary.availableBalance || 0
  }, [summary])

  const maxApplicable = useMemo(
    () => Math.min(depositBalance, Math.max(0, totalOwed)),
    [depositBalance, totalOwed],
  )

  const [isEnabled, setIsEnabled] = useState(false)
  const [appliedAmount, setAppliedAmount] = useState<number>(0)
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
  const [lineAllocations, setLineAllocations] = useState<Record<number, number>>({})
  const [isSettling, setIsSettling] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filter out non-rent items (fees) for deposit application
  const eligibleLineItems = useMemo(() => {
    return lineItems.filter(
      (item) =>
        item.remaining > 0 &&
        !['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(item.name),
    )
  }, [lineItems])

  // Helper to auto-distribute an amount sequentially across eligible line items
  const computeSequentialAllocations = useCallback(
    (totalToDistribute: number) => {
      let remaining = totalToDistribute
      const allocs: Record<number, number> = {}

      for (const item of eligibleLineItems) {
        if (remaining <= 0) {
          allocs[item.id] = 0
          continue
        }
        const needed = item.remaining
        const allocated = Math.min(needed, remaining)
        allocs[item.id] = allocated
        remaining -= allocated
      }
      return allocs
    },
    [eligibleLineItems],
  )

  // When toggle state changes
  const handleToggle = () => {
    if (!isEnabled) {
      // Enabling: default to max applicable
      const defaultAmount = maxApplicable
      setIsEnabled(true)
      setAppliedAmount(defaultAmount)
      const allocs = computeSequentialAllocations(defaultAmount)
      setLineAllocations(allocs)
      setErrorMessage(null)

      const formattedAllocs = Object.entries(allocs).map(([id, amt]) => ({
        lineItemId: Number(id),
        amount: amt,
      }))
      onDepositApplied?.(defaultAmount, formattedAllocs)
    } else {
      // Disabling: reset to 0
      setIsEnabled(false)
      setAppliedAmount(0)
      setLineAllocations({})
      setErrorMessage(null)
      onDepositApplied?.(0, [])
    }
  }

  // Handle total amount change (e.g. from preset pills or numeric input)
  const handleAmountChange = (newAmount: number) => {
    const clamped = Math.max(0, Math.min(newAmount, maxApplicable))
    setAppliedAmount(clamped)
    setErrorMessage(null)

    const allocs = computeSequentialAllocations(clamped)
    setLineAllocations(allocs)

    const formattedAllocs = Object.entries(allocs).map(([id, amt]) => ({
      lineItemId: Number(id),
      amount: amt,
    }))
    onDepositApplied?.(clamped, formattedAllocs)
  }

  // Handle individual line item allocation change
  const handleLineItemChange = (itemId: number, rawVal: number) => {
    const item = eligibleLineItems.find((i) => i.id === itemId)
    if (!item) return

    const clampedItemVal = Math.max(0, Math.min(rawVal, item.remaining))
    const updated = { ...lineAllocations, [itemId]: clampedItemVal }

    // Recompute total applied
    const newTotal = Object.values(updated).reduce((sum, v) => sum + v, 0)

    if (newTotal > depositBalance) {
      setErrorMessage(
        `Total allocated exceeds your deposit balance (${formatCurrency(depositBalance, currency)})`,
      )
      return
    }

    setErrorMessage(null)
    setLineAllocations(updated)
    setAppliedAmount(newTotal)

    const formattedAllocs = Object.entries(updated).map(([id, amt]) => ({
      lineItemId: Number(id),
      amount: amt,
    }))
    onDepositApplied?.(newTotal, formattedAllocs)
  }

  // Direct settlement using deposit balance
  const handleDirectSettlement = async () => {
    if (appliedAmount <= 0) return

    // If partial payment not allowed, ensure full settlement
    if (!canPayPartial && appliedAmount < totalOwed) {
      setErrorMessage(
        `This invoice requires full payment of ${formatCurrency(totalOwed, currency)}. Please apply the entire invoice balance or pay via bank transfer.`,
      )
      return
    }

    setIsSettling(true)
    setErrorMessage(null)

    try {
      const formattedAllocs = Object.entries(lineAllocations)
        .filter(([, amt]) => amt > 0)
        .map(([id, amt]) => ({
          lineItemId: Number(id),
          amount: amt,
        }))

      const res = await api.applyRentDeposit({
        paymentRequestUuid,
        amountToApply: appliedAmount,
        lineItemAllocations: formattedAllocs.length > 0 ? formattedAllocs : undefined,
      })

      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: ['rent-deposit-summary'] })
      queryClient.invalidateQueries({ queryKey: ['payment-request'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })

      setSuccessMessage('Deposit applied successfully!')
      onSettledSuccess?.(isFullSettlement)
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to apply rent deposit balance. Please try again.',
      )
    } finally {
      setIsSettling(false)
    }
  }

  // If loading or no deposit balance is available, don't show card
  if (isLoading || depositBalance <= 0) {
    return null
  }

  const remainingAfterDeposit = Math.max(0, totalOwed - appliedAmount)
  const isFullSettlement = remainingAfterDeposit === 0 && appliedAmount > 0

  return (
    <div className={`rent-deposit-card ${isEnabled ? 'rent-deposit-card--active' : ''}`}>
      {/* Card Header & Toggle */}
      <div className="rent-deposit-card__header">
        <div className="rent-deposit-card__info">
          <div className="rent-deposit-card__icon-box">
            <Sparkles size={20} className="rent-deposit-card__sparkle" />
          </div>
          <div>
            <div className="rent-deposit-card__title-row">
              <span className="rent-deposit-card__title">Rent Deposit Balance</span>
              <span className="rent-deposit-card__badge">
                {formatCurrency(depositBalance, currency)} Available
              </span>
            </div>
            <p className="rent-deposit-card__subtitle">
              Apply stored deposits and overpayment credits to reduce or settle this invoice.
            </p>
          </div>
        </div>

        {/* Apple-style Fluid Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          onClick={handleToggle}
          className={`rent-deposit-card__switch ${
            isEnabled ? 'rent-deposit-card__switch--on' : ''
          }`}
        >
          <span className="rent-deposit-card__switch-thumb" />
        </button>
      </div>

      {/* Expanded Interactive Tray */}
      {isEnabled && (
        <div className="rent-deposit-card__body">
          <div className="rent-deposit-card__divider" />

          {/* Quick Preset Buttons */}
          <div className="rent-deposit-card__presets">
            <span className="rent-deposit-card__preset-label">Quick apply:</span>
            <button
              type="button"
              className={`rent-deposit-card__preset-btn ${
                appliedAmount === maxApplicable ? 'rent-deposit-card__preset-btn--active' : ''
              }`}
              onClick={() => handleAmountChange(maxApplicable)}
            >
              Use Max ({formatCurrency(maxApplicable, currency)})
            </button>
            {canPayPartial && maxApplicable > 50000 && (
              <button
                type="button"
                className={`rent-deposit-card__preset-btn ${
                  appliedAmount === Math.round(maxApplicable / 2)
                    ? 'rent-deposit-card__preset-btn--active'
                    : ''
                }`}
                onClick={() => handleAmountChange(Math.round(maxApplicable / 2))}
              >
                50% ({formatCurrency(Math.round(maxApplicable / 2), currency)})
              </button>
            )}
          </div>

          {/* Amount Input with Currency Display */}
          <div className="rent-deposit-card__amount-input-row">
            <div className="rent-deposit-card__input-group">
              <span className="rent-deposit-card__currency-prefix">₦</span>
              <input
                type="number"
                min={0}
                max={maxApplicable}
                value={appliedAmount || ''}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                placeholder="0"
                className="rent-deposit-card__input"
              />
            </div>

            <div className="rent-deposit-card__calc-summary">
              <span className="rent-deposit-card__calc-label">Net to pay:</span>
              <span className="rent-deposit-card__calc-val">
                {formatCurrency(remainingAfterDeposit, currency)}
              </span>
            </div>
          </div>

          {/* Line Item Breakdown Toggle (if multi-item) */}
          {eligibleLineItems.length > 1 && (
            <div className="rent-deposit-card__line-items-section">
              <button
                type="button"
                className="rent-deposit-card__breakdown-toggle"
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
              >
                <div className="rent-deposit-card__breakdown-title">
                  <Sliders size={14} />
                  <span>Customize line-item allocation</span>
                </div>
                {isBreakdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isBreakdownOpen && (
                <div className="rent-deposit-card__breakdown-tray">
                  {eligibleLineItems.map((item) => {
                    const currentAlloc = lineAllocations[item.id] || 0
                    return (
                      <div key={item.id} className="rent-deposit-card__breakdown-row">
                        <div className="rent-deposit-card__breakdown-item-info">
                          <span className="rent-deposit-card__breakdown-item-name">
                            {item.name}
                          </span>
                          <span className="rent-deposit-card__breakdown-item-rem">
                            Owed: {formatCurrency(item.remaining, currency)}
                          </span>
                        </div>

                        <div className="rent-deposit-card__breakdown-input-wrap">
                          <span className="rent-deposit-card__breakdown-prefix">₦</span>
                          <input
                            type="number"
                            min={0}
                            max={item.remaining}
                            value={currentAlloc || ''}
                            onChange={(e) =>
                              handleLineItemChange(item.id, Number(e.target.value))
                            }
                            placeholder="0"
                            className="rent-deposit-card__breakdown-input"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Feedback & Alerts */}
          {errorMessage && (
            <div className="rent-deposit-card__alert rent-deposit-card__alert--error">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rent-deposit-card__alert rent-deposit-card__alert--success">
              <Check size={15} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Instant Full Settlement CTA Button (when 100% covered) */}
          {isFullSettlement && (
            <button
              type="button"
              className="rent-deposit-card__settle-btn"
              onClick={handleDirectSettlement}
              disabled={isSettling}
            >
              {isSettling ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Settling invoice with deposit...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>
                    Settle Full Invoice with Deposit ({formatCurrency(appliedAmount, currency)})
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}

          {/* Partial Payment Note and Direct Apply Option (when partial remaining) */}
          {!isFullSettlement && appliedAmount > 0 && (
            <div className="rent-deposit-card__partial-actions">
              <div className="rent-deposit-card__note">
                <ShieldCheck size={14} className="rent-deposit-card__note-icon" />
                <span>
                  <strong>{formatCurrency(appliedAmount, currency)}</strong> will be applied from your
                  deposit. Proceed with checkout below to pay the remaining{' '}
                  <strong>{formatCurrency(remainingAfterDeposit, currency)}</strong>.
                </span>
              </div>

              {canPayPartial && (
                <button
                  type="button"
                  className="rent-deposit-card__partial-settle-btn"
                  onClick={handleDirectSettlement}
                  disabled={isSettling}
                >
                  {isSettling ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Applying deposit to line items...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>
                        Apply {formatCurrency(appliedAmount, currency)} from deposit now (pay remainder later)
                      </span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scoped CSS styling strictly following Design Guidelines */}
      <style jsx>{`
        .rent-deposit-card {
          background: var(--surface);
          border: 1.5px solid var(--border-solid);
          border-radius: var(--radius-lg, 16px);
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .rent-deposit-card--active {
          border-color: var(--clay);
          background: #ffffff;
          box-shadow: 0 8px 30px rgba(217, 119, 87, 0.08);
        }

        .rent-deposit-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .rent-deposit-card__info {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .rent-deposit-card__icon-box {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--clay-faint);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(217, 119, 87, 0.15);
        }

        .rent-deposit-card__title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 3px;
        }

        .rent-deposit-card__title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .rent-deposit-card__badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
          letter-spacing: 0.02em;
        }

        .rent-deposit-card__subtitle {
          font-size: 12.5px;
          color: var(--text-muted);
          line-height: 1.4;
          max-width: 480px;
        }

        /* Apple-style Fluid Switch */
        .rent-deposit-card__switch {
          width: 50px;
          height: 30px;
          border-radius: 30px;
          background: #e2ddd7;
          border: none;
          cursor: pointer;
          position: relative;
          flex-shrink: 0;
          padding: 2px;
          transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .rent-deposit-card__switch:active {
          transform: scale(0.97);
        }

        .rent-deposit-card__switch--on {
          background: var(--clay);
        }

        .rent-deposit-card__switch-thumb {
          display: block;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateX(0);
        }

        .rent-deposit-card__switch--on .rent-deposit-card__switch-thumb {
          transform: translateX(20px);
        }

        .rent-deposit-card__divider {
          height: 1px;
          background: var(--border);
          margin: 16px 0;
        }

        .rent-deposit-card__presets {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .rent-deposit-card__preset-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .rent-deposit-card__preset-btn {
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .rent-deposit-card__preset-btn:hover {
          border-color: var(--clay);
          color: var(--clay);
          background: var(--clay-faint);
        }

        .rent-deposit-card__preset-btn:active {
          transform: scale(0.97);
        }

        .rent-deposit-card__preset-btn--active {
          background: var(--clay-faint);
          border-color: var(--clay);
          color: var(--clay);
        }

        .rent-deposit-card__amount-input-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: var(--radius-md, 12px);
          padding: 12px 16px;
          margin-bottom: 14px;
        }

        .rent-deposit-card__input-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
        }

        .rent-deposit-card__currency-prefix {
          font-size: 18px;
          font-weight: 700;
          color: var(--clay);
        }

        .rent-deposit-card__input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          outline: none;
        }

        .rent-deposit-card__calc-summary {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          border-left: 1px solid var(--border);
          padding-left: 16px;
        }

        .rent-deposit-card__calc-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 600;
        }

        .rent-deposit-card__calc-val {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
        }

        .rent-deposit-card__line-items-section {
          margin-top: 10px;
          margin-bottom: 14px;
        }

        .rent-deposit-card__breakdown-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: var(--radius-sm, 8px);
          background: var(--surface2, #f5f5f5);
          border: none;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: background 0.15s ease;
        }

        .rent-deposit-card__breakdown-toggle:hover {
          background: var(--border-solid);
        }

        .rent-deposit-card__breakdown-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rent-deposit-card__breakdown-tray {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        }

        .rent-deposit-card__breakdown-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          background: #ffffff;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .rent-deposit-card__breakdown-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rent-deposit-card__breakdown-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .rent-deposit-card__breakdown-item-rem {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .rent-deposit-card__breakdown-input-wrap {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 6px;
          padding: 4px 8px;
          width: 120px;
        }

        .rent-deposit-card__breakdown-prefix {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .rent-deposit-card__breakdown-input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          outline: none;
          text-align: right;
        }

        .rent-deposit-card__alert {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .rent-deposit-card__alert--error {
          background: rgba(239, 68, 68, 0.08);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .rent-deposit-card__alert--success {
          background: rgba(34, 197, 94, 0.08);
          color: var(--success);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .rent-deposit-card__settle-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          background: linear-gradient(135deg, var(--clay) 0%, var(--clay-hover) 100%);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-md, 12px);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(217, 119, 87, 0.35);
          transition: all 0.2s ease;
        }

        .rent-deposit-card__settle-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(217, 119, 87, 0.45);
        }

        .rent-deposit-card__settle-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .rent-deposit-card__settle-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .rent-deposit-card__note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          background: var(--surface2, #f5f5f5);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
        }

        .rent-deposit-card__note-icon {
          color: var(--clay);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .rent-deposit-card__partial-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rent-deposit-card__partial-settle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          background: var(--surface, #ffffff);
          color: var(--clay, #dc2626);
          border: 1.5px solid var(--clay, #dc2626);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .rent-deposit-card__partial-settle-btn:hover:not(:disabled) {
          background: var(--clay-faint, #fbf7f4);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(217, 119, 87, 0.12);
        }

        .rent-deposit-card__partial-settle-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .rent-deposit-card__partial-settle-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
