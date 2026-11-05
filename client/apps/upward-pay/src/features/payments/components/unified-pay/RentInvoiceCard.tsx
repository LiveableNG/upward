'use client'

import React, { useMemo } from 'react'
import {
  CalendarDays,
  Building2,
  User,
  MapPin,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput, formatDate } from '@/lib/utils'
import { type CheckoutReceiptRow } from './CheckoutReceipt'

interface RentInvoiceCardProps {
  paymentData: any
  currency: string
  totalOwed: number
  parsedAmount: number
  receiptRows: CheckoutReceiptRow[]
  canPayPartial?: boolean
  isBelowMin?: boolean
  minRequired?: number
  onAllocationChange?: (id: number, amount: number) => void
}

function formatPeriodSimple(
  startDateStr?: string | null,
  endDateStr?: string | null,
  rentType?: string | null,
  dueDateStr?: string | null,
): string {
  const typeLabel = rentType ? ` (${rentType})` : ''

  if (startDateStr && endDateStr) {
    return `${formatDate(startDateStr)} – ${formatDate(endDateStr)}${typeLabel}`
  }
  if (endDateStr) {
    return `Cycle ending ${formatDate(endDateStr)}${typeLabel}`
  }
  if (dueDateStr) {
    return `Current period · Due ${formatDate(dueDateStr)}`
  }
  return 'Current Tenancy Period'
}

export function RentInvoiceCard({
  paymentData,
  currency,
  totalOwed,
  parsedAmount,
  receiptRows,
  canPayPartial = false,
  isBelowMin = false,
  minRequired = 0,
  onAllocationChange,
}: RentInvoiceCardProps) {
  const payment = paymentData?.payment || {}
  const user = paymentData?.user || {}
  const property = paymentData?.property || {}
  const company = paymentData?.company || {}
  const manager = paymentData?.manager || null

  // 1. Invoice Number & Status
  const invoiceNumber =
    payment.reference || (payment.uuid ? `INV-${payment.uuid.slice(-8).toUpperCase()}` : 'INV-RENT')
  const dueDate = payment.dueDate
  const isOverdue =
    dueDate && !isNaN(new Date(dueDate).getTime()) && new Date(dueDate).getTime() < Date.now()
  const amountPaidAlready = Number(payment.amountPaid || 0)

  const statusBadge = useMemo(() => {
    if (payment.status === 'PAID' || (totalOwed <= 0 && amountPaidAlready > 0)) {
      return { label: 'Settled', tone: 'paid' }
    }
    if (payment.status === 'PARTIAL' || amountPaidAlready > 0) {
      return { label: 'Partially Paid', tone: 'partial' }
    }
    if (isOverdue) {
      return { label: 'Overdue', tone: 'overdue' }
    }
    return { label: 'Due', tone: 'due' }
  }, [payment.status, totalOwed, amountPaidAlready, isOverdue])

  // 2. Rental Period Coverage (derived ONLY from payment_request and upward_user_property)
  const coverageStart = payment.rentStartDate || property.rentStartDate || null
  const coverageEnd = payment.rentEndDate || property.rentEndDate || null
  const rentType = payment.rentType || property.rentType || null

  const periodText = useMemo(() => {
    return formatPeriodSimple(coverageStart, coverageEnd, rentType, dueDate)
  }, [coverageStart, coverageEnd, rentType, dueDate])

  // 3. Parties Information
  const payableToName =
    payment.verifiedRecipientName ||
    company.name ||
    (manager ? `${manager.firstName || ''} ${manager.lastName || ''}`.trim() : null) ||
    'Property Owner / Landlord'

  const isVerifiedRecipient = Boolean(payment.verifiedRecipientName || property.isVerified)

  const manualAccount = property.manualAccount
  const payableToMeta = manualAccount?.accountNumber
    ? `${manualAccount.bankName || 'Bank'} · ${manualAccount.accountNumber}`
    : manager?.firstName
    ? `Managed by ${manager.firstName} ${manager.lastName || ''}`.trim()
    : 'Verified Bank Settlement Account'

  const tenantName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant'
  const propertyAddress = property.locationAddress || 'Linked Rental Property'
  const tenantContact = user.email || user.phone || ''

  const finalPayable = parsedAmount || totalOwed

  return (
    <div className="rent-invoice">
      {/* ── Invoice Header ── */}
      <div className="rent-invoice__header">
        <div className="rent-invoice__header-left">
          <span className="rent-invoice__doc-label">Rent Invoice</span>
          <span className="rent-invoice__number">{invoiceNumber}</span>
        </div>
        <div className={`rent-invoice__status-badge rent-invoice__status-badge--${statusBadge.tone}`}>
          <span>●</span>
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* ── Due Date Row (Clean, single due notice) ── */}
      {dueDate && (
        <div className="rent-invoice__due-row">
          <Clock size={12} className="rent-invoice__due-icon" />
          <span>Due date:</span>
          <strong>{formatDate(dueDate)}</strong>
        </div>
      )}

      {/* ── Coverage Period (Simple, single clear statement) ── */}
      <div className="rent-invoice__period-strip">
        <CalendarDays size={14} className="rent-invoice__period-strip-icon" />
        <div className="rent-invoice__period-strip-text">
          <span className="rent-invoice__period-strip-label">Payment for:</span>
          <strong className="rent-invoice__period-strip-value">{periodText}</strong>
        </div>
      </div>

      {/* ── Parties Grid: Payable To & Billed To ── */}
      <div className="rent-invoice__parties">
        <div className="rent-invoice__party-card">
          <div className="rent-invoice__party-label">
            <Building2 size={11} />
            <span>Payable To</span>
          </div>
          <div className="rent-invoice__party-name">
            <span>{payableToName}</span>
            {isVerifiedRecipient && (
              <CheckCircle2 size={13} className="rent-invoice__verified-icon" aria-label="Verified account" />
            )}
          </div>
          <div className="rent-invoice__party-meta">{payableToMeta}</div>
        </div>

        <div className="rent-invoice__party-card">
          <div className="rent-invoice__party-label">
            <User size={11} />
            <span>Billed To</span>
          </div>
          <div className="rent-invoice__party-name">{tenantName}</div>
          <div className="rent-invoice__party-meta">
            <div className="rent-invoice__address-line">
              <MapPin size={11} className="rent-invoice__pin-icon" />
              <span>{propertyAddress}</span>
            </div>
            {tenantContact && <div className="rent-invoice__contact-line">{tenantContact}</div>}
          </div>
        </div>
      </div>

      {/* ── Itemized Statement (Clean Breakdown) ── */}
      <div className="rent-invoice__breakdown">
        <div className="rent-invoice__breakdown-head">
          <span className="rent-invoice__breakdown-title">Statement Breakdown</span>
          {canPayPartial && onAllocationChange && (
            <span className="rent-invoice__breakdown-hint">Tap amount to edit</span>
          )}
        </div>

        <div className="rent-invoice__rows">
          {receiptRows.map((row) => (
            <div key={row.id} className="rent-invoice__row">
              <div className="rent-invoice__row-info">
                <span className="rent-invoice__row-label">{row.name}</span>
                {row.maxAmount && row.maxAmount !== row.amount ? (
                  <span className="rent-invoice__row-sub">
                    Balance: {formatCurrency(row.maxAmount, currency)}
                  </span>
                ) : null}
              </div>

              {row.editable && onAllocationChange ? (
                <div className="rent-invoice__row-edit">
                  <span className="rent-invoice__row-currency">{currency}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="rent-invoice__row-input"
                    value={formatCurrencyInput(row.amount)}
                    onChange={(e) =>
                      onAllocationChange(row.id, parseCurrencyInput(e.target.value) ?? 0)
                    }
                    onFocus={(e) => e.target.select()}
                    max={row.maxAmount}
                    min={0}
                    aria-label={`${row.name} payment amount`}
                  />
                </div>
              ) : (
                <span className="rent-invoice__row-value">
                  {formatCurrency(row.amount, currency)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Total Row ── */}
        <div className="rent-invoice__total-row">
          <span>Total</span>
          <strong>{formatCurrency(finalPayable, currency)}</strong>
        </div>

        {isBelowMin && (
          <p className="rent-invoice__min-hint">
            Minimum payment required is {formatCurrency(minRequired, currency)}
          </p>
        )}
      </div>
    </div>
  )
}
