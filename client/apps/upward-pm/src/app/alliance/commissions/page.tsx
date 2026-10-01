'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  CreditCard,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAllianceCommissions } from '@/features/alliance/hooks/useAlliance'
import { AllianceCommissionStatus } from '@/features/alliance/types/alliance.types'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { StatGrid } from '@/components/ui/StatCard/StatGrid'
import { ControlBar } from '@/components/ui/ControlBar/ControlBar'
import { SearchInput } from '@/components/ui/ControlBar/SearchInput'
import { FilterDropdown } from '@/components/ui/ControlBar/FilterDropdown'

export default function AllianceCommissionsPage() {
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<AllianceCommissionStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error } = useAllianceCommissions({
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    search: search.trim() || undefined,
    page,
    limit: 20,
  })

  const formatPrice = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency === 'NGN' ? 'NGN' : currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const commissions = data?.items || []
  const stats = data?.stats || {
    totalEarned: 0,
    totalPayable: 0,
    totalPaid: 0,
    totalPending: 0,
    count: 0,
  }
  const meta = data?.meta || { page: 1, total: 0, totalPages: 1 }

  const getStatusBadge = (status: AllianceCommissionStatus) => {
    switch (status) {
      case 'PAID':
        return { label: 'Paid Out', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }
      case 'PAYABLE':
        return { label: 'Payable', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }
      case 'EARNED':
        return { label: 'Earned', bg: 'rgba(22, 101, 52, 0.12)', color: 'var(--forest)' }
      case 'PENDING':
        return { label: 'Pending', bg: 'rgba(234, 179, 8, 0.1)', color: '#854d0e' }
      case 'REVERSED':
        return { label: 'Reversed', bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }
      default:
        return { label: status, bg: 'var(--bg)', color: 'var(--text-muted)' }
    }
  }

  return (
    <div>
      {/* KPI Stats Grid */}
      <div style={{ marginBottom: '24px' }}>
        <StatGrid>
          <StatCard
            label="Total Earned"
            value={formatPrice(stats.totalEarned)}
            icon={TrendingUp}
            tooltip="Total confirmed commission attribution across all converted client referrals"
          />
          <StatCard
            label="Payable / Cleared"
            value={formatPrice(stats.totalPayable)}
            icon={CreditCard}
            tooltip="Cleared funds ready for the upcoming payout settlement cycle"
          />
          <StatCard
            label="Paid to Date"
            value={formatPrice(stats.totalPaid)}
            icon={CheckCircle2}
            tooltip="Total commission payouts successfully settled to your payout account"
          />
          <StatCard
            label="Pending Clearance"
            value={formatPrice(stats.totalPending)}
            icon={Clock}
            tooltip="Awaiting qualifying transaction verification and clearance period"
          />
        </StatGrid>
      </div>

      {/* Filters Bar via ControlBar */}
      <div style={{ marginBottom: '20px' }}>
        <ControlBar>
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder="Search reference, listing, or client..."
          />

          <FilterDropdown
            label="Commission Status"
            value={selectedStatus}
            icon={Activity}
            options={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Earned', value: 'EARNED' },
              { label: 'Payable', value: 'PAYABLE' },
              { label: 'Paid Out', value: 'PAID' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Reversed', value: 'REVERSED' },
            ]}
            onChange={(val) => {
              setSelectedStatus(val as any)
              setPage(1)
            }}
          />
        </ControlBar>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card animate-pulse"
              style={{ height: '80px', borderRadius: '14px' }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          className="card"
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--danger)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={28} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load commissions</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {(error as any)?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && commissions.length === 0 && (
        <div
          className="card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(22, 101, 52, 0.08)',
              color: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={26} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
            No Commission Records Yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
            {search || selectedStatus !== 'ALL'
              ? 'No commission records match your current filter criteria.'
              : 'You will earn commissions automatically whenever clients you referred successfully complete their rent payment or property purchase on the network.'}
          </p>
          <Link
            href="/alliance/discover"
            className="btn btn--primary"
            style={{ marginTop: '8px', height: '38px', textDecoration: 'none' }}
          >
            Browse Alliance Listings to Refer
          </Link>
        </div>
      )}

      {/* Commission Ledger Table */}
      {!isLoading && !isError && commissions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--ivory-dim)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>Date Earned</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>Listing & Client</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>Transaction Amount</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>Commission</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((comm) => {
                  const badge = getStatusBadge(comm.status)
                  return (
                    <tr
                      key={comm.uuid}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          {new Date(comm.earnedAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(comm.earnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Listing & Client */}
                      <td style={{ padding: '14px 18px' }}>
                        {comm.listing ? (
                          <Link
                            href={`/alliance/discover/${comm.listing.uuid}`}
                            style={{
                              fontWeight: 600,
                              color: 'var(--text)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {comm.listing.title}
                            <ArrowUpRight size={12} color="var(--text-muted)" />
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>Alliance Listing</span>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={11} />
                          Client: <strong>{comm.referral?.clientName || 'Referred Client'}</strong>
                        </div>
                      </td>

                      {/* Source Transaction Amount */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {formatPrice(comm.sourceAmount, comm.currency)}
                        </div>
                      </td>

                      {/* Commission Amount */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--forest)' }}>
                          {formatPrice(comm.commissionAmount, comm.currency)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {comm.commissionRate}% {comm.commissionType.toLowerCase()}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: badge.bg,
                            color: badge.color,
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-block',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Reference & Actions */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {comm.transactionReference || 'N/A'}
                        </div>
                        {comm.notes && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {comm.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 20px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{ height: '32px', padding: '0 12px', gap: '4px', fontSize: '12px' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Page {meta.page} of {meta.totalPages} ({meta.total} records)
              </span>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                style={{ height: '32px', padding: '0 12px', gap: '4px', fontSize: '12px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
