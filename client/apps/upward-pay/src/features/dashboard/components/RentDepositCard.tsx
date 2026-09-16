'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Sparkles, Building } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export function RentDepositCard() {
  const router = useRouter()

  const { data: summary } = useQuery({
    queryKey: ['rent-deposit-summary'],
    queryFn: () => api.getRentDepositSummary(),
    staleTime: 1000 * 30,
  })

  if (!summary) return null

  const { availableBalance, currency, property } = summary
  const hasBalance = (availableBalance || 0) > 0

  // Strictly only show if the user actually has a deposit balance (e.g. from an overpayment)
  if (!hasBalance) return null

  return (
    <div
      className="dashboard__deposit-card"
      onClick={() => router.push('/dashboard/deposit-balance')}
      style={{
        background: '#ffffff',
        border: hasBalance
          ? '1px solid rgba(217, 119, 87, 0.25)'
          : '1px solid var(--border-solid, #ebe4da)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: hasBalance
          ? '0 4px 16px -2px rgba(217, 119, 87, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)'
          : '0 2px 8px rgba(0, 0, 0, 0.02)',
        marginBottom: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--clay-faint)',
            color: 'var(--clay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: 'inset 0 0 0 1px rgba(217, 119, 87, 0.15)',
          }}
        >
          {hasBalance ? <Sparkles size={20} /> : <Building size={20} />}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            >
              Rent Deposit Balance
            </span>
            {hasBalance && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#15803d',
                  borderRadius: '12px',
                }}
              >
                Active & Ready
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {hasBalance
              ? `${formatCurrency(availableBalance, currency)} stored for upcoming rent`
              : 'Direct Nuban DVA top-up ready'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '12px' }}>
        {hasBalance && (
          <span
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatCurrency(availableBalance, currency)}
          </span>
        )}
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowUpRight size={15} />
        </div>
      </div>
    </div>
  )
}
