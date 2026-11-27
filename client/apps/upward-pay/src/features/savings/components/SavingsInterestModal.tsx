'use client'

import React from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Loader2,
  PiggyBank,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useToast } from '@/components/common/Toast'
import { formatCurrency } from '@/lib/utils'
import {
  useIndicateSavingsInterest,
  useSavingsInterestStatus,
} from '../hooks/useRentSavings'
import type { SavingsInterestStatusData } from '../services/savingsService'
import '@/styles/savings-interest-modal.css'

interface SavingsInterestContentProps {
  source?: string
  onDone: () => void
  secondaryLabel?: string
}

export function SavingsInterestContent({
  source = 'savings_cta',
  onDone,
  secondaryLabel = 'Maybe later',
}: SavingsInterestContentProps) {
  const toast = useToast()
  const { data: statusData, isLoading } = useSavingsInterestStatus(true)
  const indicateMutation = useIndicateSavingsInterest()

  const status: SavingsInterestStatusData | null = indicateMutation.data ?? statusData ?? null
  const rewardAmountNgn = status?.campaign?.reward_amount_ngn ?? 3000
  const canWinCashback = status?.campaign?.can_win_cashback ?? true
  const hasIndicated = Boolean(status?.has_indicated_interest)
  const isCashbackAllocated =
    hasIndicated &&
    (status?.grant_status === 'RESERVED' || status?.grant_status === 'CREDITED') &&
    (status?.allocated_amount_ngn ?? 0) > 0

  const handleConfirm = async () => {
    try {
      const res = await indicateMutation.mutateAsync(source)
      if (res.won_cashback) {
        toast.success(`You got ${formatCurrency(res.allocated_amount_ngn, 'NGN')} towards your rent!`)
      } else {
        toast.success("You're on the early access list!")
      }
    } catch {
      toast.error('Something went wrong. Please try again in a moment.')
    }
  }

  if (isLoading && !status) {
    return (
      <div className="savings-interest-modal">
        <div className="savings-interest-modal__skeleton animate-pulse" />
      </div>
    )
  }

  if (isCashbackAllocated) {
    const wonAmount = status?.allocated_amount_ngn || rewardAmountNgn
    return (
      <div className="savings-interest-modal">
        <div className="savings-interest-modal__hero">
          <div className="savings-interest-modal__badge-icon savings-interest-modal__badge-icon--won">
            <CheckCircle2 size={26} />
          </div>
          <h3 className="savings-interest-modal__title">
            You got {formatCurrency(wonAmount, 'NGN')}!
          </h3>
          <p className="savings-interest-modal__desc">
            Your bonus is saved for you. We&apos;ll let you know as soon as Rent Savings opens so
            you can start using it.
          </p>

          <div className="savings-interest-modal__reward-card savings-interest-modal__reward-card--won">
            <div>
              <span className="savings-interest-modal__reward-label">Rent Savings Bonus</span>
              <span className="savings-interest-modal__reward-amount">
                {formatCurrency(wonAmount, 'NGN')}
              </span>
            </div>
            <span className="savings-interest-modal__reward-pill savings-interest-modal__reward-pill--won">
              <CheckCircle2 size={13} />
              <span>{status?.grant_status === 'CREDITED' ? 'Added' : 'Saved for you'}</span>
            </span>
          </div>
        </div>

        <div className="savings-interest-modal__actions">
          <button
            type="button"
            className="savings-interest-modal__btn-primary"
            onClick={onDone}
          >
            <span>Got it</span>
          </button>
        </div>
      </div>
    )
  }

  if (hasIndicated && status?.grant_status === 'WAITLISTED') {
    return (
      <div className="savings-interest-modal">
        <div className="savings-interest-modal__hero">
          <div className="savings-interest-modal__badge-icon savings-interest-modal__badge-icon--won">
            <CheckCircle2 size={26} />
          </div>
          <h3 className="savings-interest-modal__title">You&apos;re on the list!</h3>
          <p className="savings-interest-modal__desc">
            We&apos;ll notify you as soon as Rent Savings opens.
          </p>
        </div>

        <div className="savings-interest-modal__actions">
          <button
            type="button"
            className="savings-interest-modal__btn-primary"
            onClick={onDone}
          >
            <span>Got it</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="savings-interest-modal">
      <div className="savings-interest-modal__hero">
        <div className="savings-interest-modal__badge-icon">
          {canWinCashback ? <Gift size={26} /> : <PiggyBank size={26} />}
        </div>
        <h3 className="savings-interest-modal__title">
          {canWinCashback
            ? `Get ${formatCurrency(rewardAmountNgn, 'NGN')} towards your rent`
            : 'Rent Savings is almost here'}
        </h3>
        <p className="savings-interest-modal__desc">
          {canWinCashback
            ? `Rent Savings is launching soon. Tap below to get early access and lock in a ${formatCurrency(rewardAmountNgn, 'NGN')} bonus for your savings wallet.`
            : "Rent Savings is launching soon. Tap below and we'll let you know the moment it opens."}
        </p>

        {canWinCashback && (
          <div className="savings-interest-modal__reward-card">
            <div>
              <span className="savings-interest-modal__reward-label">Your launch bonus</span>
              <span className="savings-interest-modal__reward-amount">
                {formatCurrency(rewardAmountNgn, 'NGN')}
              </span>
            </div>
            <span className="savings-interest-modal__reward-pill">
              <Gift size={13} />
              <span>For Rent Savings</span>
            </span>
          </div>
        )}
      </div>

      <div className="savings-interest-modal__actions">
        <button
          type="button"
          className="savings-interest-modal__btn-primary"
          disabled={indicateMutation.isPending}
          onClick={handleConfirm}
        >
          {indicateMutation.isPending ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Just a moment...</span>
            </>
          ) : (
            <>
              <span>
                {canWinCashback
                  ? `Count me in · Get ${formatCurrency(rewardAmountNgn, 'NGN')}`
                  : 'Notify me when it opens'}
              </span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        <button
          type="button"
          className="savings-interest-modal__btn-secondary"
          disabled={indicateMutation.isPending}
          onClick={onDone}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  )
}

interface SavingsInterestModalProps {
  isOpen: boolean
  source?: string
  onClose: () => void
}

export function SavingsInterestModal({
  isOpen,
  source = 'savings_cta',
  onClose,
}: SavingsInterestModalProps) {
  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      showClose
      showHandle
    >
      <SavingsInterestContent source={source} onDone={onClose} />
    </BottomSheetModal>
  )
}
