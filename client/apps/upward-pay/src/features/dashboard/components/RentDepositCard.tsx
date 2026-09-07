'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, ArrowUpRight, Sparkles, Building } from 'lucide-react'
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
  const hasBalance = availableBalance > 0
  const hasDva = !!property?.dva?.accountNumber

  if (!hasBalance && !hasDva) return null

  return (
    <div
      className="dashboard__deposit-card"
      onClick={() => router.push('/dashboard/deposit-balance')}
      style={{
        background: hasBalance
          ? 'linear-gradient(135deg, #18181b 0%, #27272a 100%)'
          : 'var(--surface)',
        border: hasBalance
          ? '1px solid rgba(217, 119, 87, 0.3)'
          : '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: hasBalance
          ? '0 8px 24px rgba(0, 0, 0, 0.12)'
          : '0 2px 8px rgba(0, 0, 0, 0.02)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: hasBalance ? 'rgba(217, 119, 87, 0.18)' : 'var(--clay-faint)',
            color: 'var(--clay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {hasBalance ? <Sparkles size={22} /> : <Building size={22} />}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: hasBalance ? '#ffffff' : 'var(--text)',
              }}
            >
              Rent Deposit Balance
            </span>
            {hasBalance && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  borderRadius: '12px',
                }}
              >
                Available for Rent
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: '12.5px',
              color: hasBalance ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
            }}
          >
            {hasBalance
              ? `${formatCurrency(availableBalance, currency)} available for upcoming rent`
              : 'Direct Nuban DVA top-up ready'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {hasBalance && (
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            {formatCurrency(availableBalance, currency)}
          </span>
        )}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: hasBalance ? 'rgba(255, 255, 255, 0.1)' : 'var(--surface2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: hasBalance ? '#ffffff' : 'var(--text-secondary)',
          }}
        >
          <ArrowUpRight size={16} />
        </div>
      </div>
    </div>
  )
}
