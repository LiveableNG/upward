import React from 'react'
import { Search } from 'lucide-react'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { UniversityHireRequestRecord } from '../../types'

interface HireRequestsTabProps {
  hireRequests: UniversityHireRequestRecord[]
  columns: ColumnDef<UniversityHireRequestRecord>[]
  loading: boolean
  page: number
  totalPages: number
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  placementFilter: string
  onPlacementFilterChange: (placement: string) => void
  search: string
  onSearchChange: (search: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onPageChange: (page: number) => void
}

export const HireRequestsTab: React.FC<HireRequestsTabProps> = ({
  hireRequests,
  columns,
  loading,
  page,
  totalPages,
  statusFilter,
  onStatusFilterChange,
  placementFilter,
  onPlacementFilterChange,
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
        {/* Filters */}
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
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="CONTACTED">Contacted Employer</option>
            <option value="MATCHED">Talent Matched</option>
            <option value="CLOSED">Closed / Fulfilled</option>
          </select>

          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginLeft: '6px',
            }}
          >
            Placement:
          </span>
          <select
            value={placementFilter}
            onChange={(e) => onPlacementFilterChange(e.target.value)}
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
            <option value="ALL">All Types</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
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
              placeholder="Search company, contact, phone, city..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                width: '300px',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
            Search
          </button>
        </form>
      </div>

      <DataTable<UniversityHireRequestRecord>
        data={hireRequests}
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
