'use client'

import React from 'react'
import {
  Ticket,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  RotateCcw,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import type {
  UserVoucherSummaryDto,
  UserVoucherLedgerEntryDto,
} from '../types/commerce.types'
import '../styles/voucher.css'

interface VoucherWalletSheetProps {
  isOpen: boolean
  onClose: () => void
  summary?: UserVoucherSummaryDto | null
}

function formatNgn(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

function formatLedgerDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function getEntryMeta(type: UserVoucherLedgerEntryDto['type']) {
  switch (type) {
    case 'CREDIT_SIGNUP_LINK':
      return { label: 'Welcome Voucher', positive: true, icon: ArrowDownLeft }
    case 'CREDIT_GAMING_REWARD':
      return { label: 'Reward Credit', positive: true, icon: ArrowDownLeft }
    case 'CREDIT_ADMIN_GRANT':
      return { label: 'Upward Credit', positive: true, icon: ArrowDownLeft }
    case 'RELEASE_ORDER':
      return { label: 'Voucher Returned', positive: true, icon: RotateCcw }
    case 'RESERVE_ORDER':
      return { label: 'Reserved for Order', positive: false, icon: Clock }
    case 'REDEEM_ORDER':
      return { label: 'Applied to Order', positive: false, icon: CheckCircle2 }
    case 'ADMIN_REVERSAL':
      return { label: 'Adjustment', positive: false, icon: ArrowUpRight }
    default:
      return { label: 'Voucher Activity', positive: false, icon: Ticket }
  }
}

export const VoucherWalletSheet: React.FC<VoucherWalletSheetProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const wallet = summary?.wallet
  const ledger = summary?.ledger || []
  const available = wallet?.availableBalanceNaira ?? 0
  const reserved = wallet?.reservedBalanceNaira ?? 0
  const redeemed = wallet?.lifetimeRedeemedNaira ?? 0

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Upward Voucher Balance"
      subtitle="Apply your credit at checkout on any eligible package or service quote."
      maxWidth="480px"
    >
      <div className="voucher-sheet">
        <div className="voucher-sheet__hero">
          <div className="voucher-sheet__hero-top">
            <span className="voucher-sheet__hero-label">Available Balance</span>
            <span className="voucher-sheet__hero-icon" aria-hidden="true">
              <Ticket size={16} />
            </span>
          </div>
          <div className="voucher-sheet__hero-amount">{formatNgn(available)}</div>

          <div className="voucher-sheet__stats">
            {reserved > 0 && (
              <div className="voucher-sheet__stat">
                <Lock size={12} />
                <span>{formatNgn(reserved)} reserved in pending order</span>
              </div>
            )}
            <div className="voucher-sheet__stat">
              <CheckCircle2 size={12} />
              <span>{formatNgn(redeemed)} redeemed to date</span>
            </div>
          </div>
        </div>

        <div className="voucher-sheet__hint">
          Your voucher never expires automatically and is only used when you toggle{' '}
          <strong>Apply Voucher</strong> at checkout or when paying a service quote.
        </div>

        {ledger.length > 0 && (
          <div className="voucher-sheet__history">
            <h4 className="voucher-sheet__history-title">Recent Activity</h4>
            <div className="voucher-sheet__list">
              {ledger.slice(0, 12).map((entry) => {
                const meta = getEntryMeta(entry.type)
                const Icon = meta.icon
                return (
                  <div key={entry.uuid} className="voucher-sheet__row">
                    <div
                      className={`voucher-sheet__row-icon ${
                        meta.positive
                          ? 'voucher-sheet__row-icon--credit'
                          : 'voucher-sheet__row-icon--debit'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="voucher-sheet__row-body">
                      <span className="voucher-sheet__row-title">
                        {entry.reason || meta.label}
                      </span>
                      <span className="voucher-sheet__row-sub">
                        {meta.label}
                        {entry.order?.orderNumber ? ` • ${entry.order.orderNumber}` : ''}
                        {' • '}
                        {formatLedgerDate(entry.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`voucher-sheet__row-amount ${
                        meta.positive
                          ? 'voucher-sheet__row-amount--credit'
                          : 'voucher-sheet__row-amount--debit'
                      }`}
                    >
                      {meta.positive ? '+' : '-'}
                      {formatNgn(entry.amountNaira)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </BottomSheetModal>
  )
}
