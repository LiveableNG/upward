'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Building2,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  FileText,
  User,
} from 'lucide-react'
import { AllianceNavTabs } from '@/features/alliance/components/AllianceNavTabs'
import { useAllianceCommissions } from '@/features/alliance/hooks/useAlliance'
import { AllianceCommissionStatus } from '@/features/alliance/types/alliance.types'

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
    <div className="page-container" style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Alliance Navigation Header */}
      <AllianceNavTabs activeTab="commissions" />

      {/* Page Title & Intro */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Alliance Commissions & Earnings
            </h1>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: '16px',
                background: 'rgba(22, 101, 52, 0.1)',
                color: 'var(--forest)',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {stats.count} Entitlements
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0', maxWidth: '650px' }}>
            Authoritative commission ledger for converted Alliance client referrals. Commission attribution is strictly awarded to you as the referring PM.
          </p>
        </div>

        <Link
          href="/alliance/referrals"
          className="btn btn--secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '40px',
            padding: '0 16px',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          <FileText size={16} />
          <span>View Lead Pipeline</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Earned */}
        <div
          style={{
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Earned
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(22, 101, 52, 0.1)',
                color: 'var(--forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--forest)' }}>
            {formatPrice(stats.totalEarned)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Total confirmed commission attribution
          </div>
        </div>

        {/* Payable */}
        <div
          style={{
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Payable / Cleared
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6' }}>
            {formatPrice(stats.totalPayable)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Ready for upcoming payout cycle
          </div>
        </div>

        {/* Paid */}
        <div
          style={{
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Paid to Date
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
            {formatPrice(stats.totalPaid)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Successfully settled to your account
          </div>
        </div>

        {/* Pending */}
        <div
          style={{
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Pending Clearance
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(234, 179, 8, 0.1)',
                color: '#854d0e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#854d0e' }}>
            {formatPrice(stats.totalPending)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Awaiting qualifying transaction settlement
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: 'var(--dark)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search transaction ref, listing or client..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any)
              setPage(1)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="EARNED">Earned</option>
            <option value="PAYABLE">Payable</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '100px',
                background: 'var(--dark)',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          style={{
            padding: '32px',
            background: 'var(--dark)',
            borderRadius: '14px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center',
            color: 'var(--danger)',
          }}
        >
          <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Failed to load commissions</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {(error as any)?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && commissions.length === 0 && (
        <div
          style={{
            padding: '56px 24px',
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(22, 101, 52, 0.1)',
              color: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            No Commission Records Yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: 0 }}>
            {search || selectedStatus !== 'ALL'
              ? 'No commission records match your filter criteria.'
              : 'You will earn commissions automatically whenever clients you referred successfully complete their rent payment or property lease on the network.'}
          </p>
          <Link
            href="/alliance/discover"
            className="btn btn--primary"
            style={{ marginTop: '12px', height: '38px', textDecoration: 'none' }}
          >
            Browse Alliance Listings to Refer
          </Link>
        </div>
      )}

      {/* Commission Ledger Table */}
      {!isLoading && !isError && commissions.length > 0 && (
        <div
          style={{
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date Earned</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Listing & Client</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Transaction Amount</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Commission ({'Rate'})</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Reference</th>
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
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text)' }}>
                          <Calendar size={14} color="var(--text-muted)" />
                          {new Date(comm.earnedAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(comm.earnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Listing & Client */}
                      <td style={{ padding: '16px 18px' }}>
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
                            <ArrowUpRight size={13} color="var(--text-muted)" />
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>Alliance Listing</span>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} />
                          Client: <strong>{comm.referral?.clientName || 'Referred Client'}</strong>
                        </div>
                      </td>

                      {/* Source Transaction Amount */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {formatPrice(comm.sourceAmount, comm.currency)}
                        </div>
                      </td>

                      {/* Commission Amount */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--forest)' }}>
                          {formatPrice(comm.commissionAmount, comm.currency)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {comm.commissionRate}% {comm.commissionType.toLowerCase()}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
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
                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
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
        </div>
      )}
    </div>
  )
}
