import React from 'react'
import { Search } from 'lucide-react'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { UniversityReferralRecord } from '../../types'

interface ReferralsTabProps {
  referrals: UniversityReferralRecord[]
  columns: ColumnDef<UniversityReferralRecord>[]
  loading: boolean
  page: number
  totalPages: number
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  rewardStatusFilter: string
  onRewardStatusFilterChange: (rewardStatus: string) => void
  search: string
  onSearchChange: (search: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onPageChange: (page: number) => void
}

export const ReferralsTab: React.FC<ReferralsTabProps> = ({
  referrals,
  columns,
  loading,
  page,
  totalPages,
  statusFilter,
  onStatusFilterChange,
  rewardStatusFilter,
  onRewardStatusFilterChange,
  search,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
}) => {
  return (
    <>
      <div
        className="card"
        style={{
          padding: '16px',
          borderRadius: '14px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Filter by Statuses */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{
              height: '38px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              fontWeight: 600,
              background: '#fff',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">All Enrollment Statuses</option>
            <option value="PENDING">Pending Lead / Info Session</option>
            <option value="JOINED">Joined Program</option>
            <option value="PAID">Tuition Paid</option>
            <option value="INELIGIBLE">Ineligible Lead</option>
          </select>

          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginLeft: '6px',
            }}
          >
            Payout:
          </span>
          <select
            value={rewardStatusFilter}
            onChange={(e) => onRewardStatusFilterChange(e.target.value)}
            style={{
              height: '38px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              fontWeight: 600,
              background: '#fff',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">All Payout Statuses</option>
            <option value="PENDING">Pending Payout Review</option>
            <option value="APPROVED">Approved for Payout</option>
            <option value="PAID">✓ Paid Out to Referrer</option>
          </select>
        </div>

        {/* Search Input */}
        <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search referrer or friend name, phone, email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                width: '320px',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
            Search
          </button>
        </form>
      </div>

      <DataTable<UniversityReferralRecord>
        data={referrals}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}
