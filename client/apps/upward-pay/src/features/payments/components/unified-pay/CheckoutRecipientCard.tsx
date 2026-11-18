'use client'

import React from 'react'
import { CheckCircle2, AlertCircle, Clock, Receipt } from 'lucide-react'
import { LandlordAvatar } from '@/features/dashboard/components/payment/LandlordAvatar'

export interface CheckoutRecipientCardProps {
  accountName: string
  propertyAddress?: string | null
  accountMeta?: string | null
  dueDate?: string | null
  isVerified?: boolean
  rentStartDate?: string | null
  rentEndDate?: string | null
  invoiceRef?: string | null
}

function recipientInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`
  }
  return trimmed.slice(0, 2)
}

function formatShortDate(dateVal: string | number | Date): string {
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRentalPeriod(start?: string | null, end?: string | null): string | null {
  const formattedStart = start ? formatShortDate(start) : null
  const formattedEnd = end ? formatShortDate(end) : null

  if (formattedStart && formattedEnd) {
    return `${formattedStart} – ${formattedEnd}`
  }
  if (formattedEnd) {
    return `Ends ${formattedEnd}`
  }
  if (formattedStart) {
    return `Starts ${formattedStart}`
  }
  return null
}

export function getDueStatus(dueDateStr?: string | null): {
  isOverdue: boolean
  isToday: boolean
  label: string
} | null {
  if (!dueDateStr) return null
  const due = new Date(dueDateStr)
  if (Number.isNaN(due.getTime())) return null

  const now = new Date()
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffTime = dueDay.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  const formattedDate = due.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays)
    const overdueLabel =
      daysOverdue === 1
        ? `Overdue by 1 day · ${formattedDate}`
        : daysOverdue > 60
          ? `Overdue (${daysOverdue}d) · ${formattedDate}`
          : `Overdue by ${daysOverdue} days · ${formattedDate}`
    return {
      isOverdue: true,
      isToday: false,
      label: overdueLabel,
    }
  }

  if (diffDays === 0) {
    return {
      isOverdue: false,
      isToday: true,
      label: `Today · ${formattedDate}`,
    }
  }

  return {
    isOverdue: false,
    isToday: false,
    label: formattedDate,
  }
}

export function CheckoutRecipientCard({
  accountName,
  propertyAddress,
  accountMeta,
  dueDate,
  isVerified,
  rentStartDate,
  rentEndDate,
  invoiceRef,
}: CheckoutRecipientCardProps) {
  const dueStatus = getDueStatus(dueDate)
  const rentalPeriodText = formatRentalPeriod(rentStartDate, rentEndDate)
  const displayAddress = propertyAddress || accountMeta || null

  return (
    <div className="pay-flow__recipient pay-flow__recipient--checkout">
      {/* Top row: Avatar + Recipient Name + Blue Verified Checkmark */}
      <div className="pay-flow__recipient-top">
        <LandlordAvatar letter={recipientInitial(accountName)} size={42} />
        <div className="pay-flow__recipient-body">
          <div className="pay-flow__recipient-name-row">
            <span className="pay-flow__recipient-name">{accountName}</span>
            {isVerified ? (
              <CheckCircle2
                size={15}
                className="pay-flow__recipient-verified"
                aria-label="Verified recipient"
              />
            ) : null}
          </div>
          {displayAddress ? <div className="pay-flow__recipient-meta">{displayAddress}</div> : null}
        </div>
      </div>

      {/* Invoice Details: Payment for, Payment due, and Invoice ID */}
      {rentalPeriodText || dueStatus || invoiceRef ? (
        <div className="pay-flow__invoice-details">
          {rentalPeriodText ? (
            <div className="pay-flow__invoice-detail-row">
              <span className="pay-flow__invoice-detail-label">Payment for</span>
              <span className="pay-flow__invoice-detail-value">{rentalPeriodText}</span>
            </div>
          ) : null}

          {dueStatus ? (
            <div className="pay-flow__invoice-detail-row">
              <span className="pay-flow__invoice-detail-label">Payment due</span>
              {dueStatus.isOverdue ? (
                <span className="pay-flow__due-pill pay-flow__due-pill--overdue">
                  <AlertCircle size={11} aria-hidden />
                  <span>{dueStatus.label}</span>
                </span>
              ) : dueStatus.isToday ? (
                <span className="pay-flow__due-pill pay-flow__due-pill--today">
                  <span>{dueStatus.label}</span>
                </span>
              ) : (
                <span className="pay-flow__due-pill pay-flow__due-pill--upcoming">
                  <Clock size={11} aria-hidden />
                  <span>{dueStatus.label}</span>
                </span>
              )}
            </div>
          ) : null}

          {invoiceRef ? (
            <div className="pay-flow__invoice-detail-row">
              <span className="pay-flow__invoice-detail-label">Invoice ID</span>
              <span className="pay-flow__invoice-ref-pill" title={`Reference: ${invoiceRef}`}>
                <Receipt size={11} aria-hidden />
                <span>{invoiceRef}</span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
