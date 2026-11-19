'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Ticket,
  PiggyBank,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useUserRewardsSummary } from '../hooks/useRewards'

interface VoucherWalletModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatNgn(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getActivityRoute(triggerKey: string): string {
  switch (triggerKey) {
    case 'FORM_INCOME_INFO':
      return '/dashboard/goals?category=income'
    case 'FORM_CAREER_GOALS':
      return '/dashboard/goals?category=career'
    case 'FORM_FINANCIAL_GOALS':
      return '/dashboard/goals?category=housing'
    case 'FORM_HOME_INSURANCE':
      return '/dashboard/rent-support-insurance'
    case 'SAVINGS_INTEREST_INDICATION':
    case 'SAVINGS_DEPOSIT_QUALIFYING':
      return '/dashboard/savings'
    default:
      return '/dashboard/goals'
  }
}

export function VoucherWalletModal({ isOpen, onClose }: VoucherWalletModalProps) {
  const router = useRouter()
  const { data: summary, isLoading } = useUserRewardsSummary(isOpen)

  if (!isOpen) return null

  const availableNaira = summary?.availableBalanceNaira ?? 0
  const totalEarnedNaira = summary?.totalEarnedNaira ?? 0
  const totalRedeemedNaira = summary?.totalRedeemedNaira ?? 0
  const totalCashbackNaira = summary?.totalCashbackNaira ?? 0
  const vouchers = summary?.vouchers || []
  const activities = (summary?.availableActivities || []).filter(
    (a) => a.triggerKey !== 'CAMPAIGN_SIGNUP_VOUCHER',
  )

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rewards & Promotional Vouchers"
      subtitle="Earn marketplace discount vouchers and real savings cashback."
      maxWidth="540px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 12 }}>
        {/* Balance Overview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: 14,
              background:
                'linear-gradient(135deg, rgba(217, 119, 87, 0.16) 0%, rgba(217, 119, 87, 0.04) 100%)',
              border: '1px solid rgba(217, 119, 87, 0.35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--clay)',
              }}
            >
              <Ticket size={14} />
              <span>Voucher Balance</span>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text)',
                marginTop: 6,
              }}
            >
              {isLoading ? '...' : formatNgn(availableNaira)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 4 }}>
              Earned: {formatNgn(totalEarnedNaira)} • Redeemed: {formatNgn(totalRedeemedNaira)}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: 14,
              background: 'var(--surface-hover, rgba(255,255,255,0.03))',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#10b981',
              }}
            >
              <PiggyBank size={14} />
              <span>Savings Cashback</span>
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text)',
                marginTop: 6,
              }}
            >
              {isLoading ? '...' : formatNgn(totalCashbackNaira)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 4 }}>
              Real cash credited to your Savings Wallet
            </div>
          </div>
        </div>

        {/* Distinction Explainer */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--text)' }}>How it works:</strong> Promotional Vouchers are
          accumulated discounts automatically deducted at checkout when you shop on the Upward
          Marketplace. Cashback rewards are real monetary value moved directly into your Savings
          Wallet.
        </div>

        {/* Ways to Earn More Vouchers & Cashback */}
        {activities.length > 0 && (
          <div>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                marginBottom: 10,
              }}
            >
              Ways to Earn Rewards
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activities.map((act) => (
                <div
                  key={act.triggerKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    background: act.isCompleted
                      ? 'rgba(16, 185, 129, 0.05)'
                      : 'var(--surface, rgba(255,255,255,0.02))',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      <span>{act.name}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 999,
                          background:
                            act.rewardCategory === 'CASHBACK'
                              ? 'rgba(16, 185, 129, 0.14)'
                              : 'rgba(217, 119, 87, 0.16)',
                          color:
                            act.rewardCategory === 'CASHBACK' ? '#10b981' : 'var(--clay)',
                        }}
                      >
                        +{formatNgn(act.rewardAmountNaira)}{' '}
                        {act.rewardCategory === 'CASHBACK' ? 'Cashback' : 'Voucher'}
                      </span>
                    </div>
                    {act.description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {act.description}
                      </div>
                    )}
                  </div>

                  {act.isCompleted ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#10b981',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Earned</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        router.push(getActivityRoute(act.triggerKey))
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 12px',
                        borderRadius: 8,
                        background: 'var(--clay)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <span>Earn</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Voucher Records History */}
        <div>
          <h4
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: 10,
            }}
          >
            Your Voucher Ledger ({vouchers.length})
          </h4>
          {vouchers.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                borderRadius: 12,
                border: '1px dashed var(--border, rgba(255,255,255,0.12))',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              <Sparkles size={20} style={{ margin: '0 auto 8px', color: 'var(--clay)' }} />
              <div>No promotional vouchers earned yet.</div>
              <div style={{ fontSize: '12px', marginTop: 4 }}>
                Complete any qualifying form above to earn your first ₦1,000 voucher!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vouchers.map((v) => {
                const isAvailable =
                  (v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED') &&
                  v.remainingAmountNaira > 0
                return (
                  <div
                    key={v.uuid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--border, rgba(255,255,255,0.08))',
                      background: 'var(--surface, rgba(255,255,255,0.02))',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: 'var(--text)',
                        }}
                      >
                        {v.reason}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                          marginTop: 3,
                        }}
                      >
                        <span>{v.code}</span>
                        <span>•</span>
                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                        {v.campaignTag && (
                          <>
                            <span>•</span>
                            <span>Campaign: {v.campaignTag}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isAvailable ? 'var(--clay)' : 'var(--text-muted)',
                        }}
                      >
                        {formatNgn(v.remainingAmountNaira)}
                        {v.redeemedAmountNaira > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: 'var(--text-muted)',
                              marginLeft: 4,
                            }}
                          >
                            / {formatNgn(v.amountNaira)}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '11px',
                          fontWeight: 600,
                          marginTop: 2,
                          color:
                            v.status === 'ACTIVE'
                              ? '#10b981'
                              : v.status === 'PARTIALLY_REDEEMED'
                                ? '#f59e0b'
                                : 'var(--text-muted)',
                        }}
                      >
                        {v.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 size={11} />
                            <span>Available</span>
                          </>
                        ) : v.status === 'PARTIALLY_REDEEMED' ? (
                          <>
                            <Clock size={11} />
                            <span>Partially Used</span>
                          </>
                        ) : v.status === 'REDEEMED' ? (
                          <>
                            <ShoppingBag size={11} />
                            <span>Redeemed</span>
                          </>
                        ) : (
                          <span>{v.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </BottomSheetModal>
  )
}
