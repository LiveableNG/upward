import React from 'react'
import { Search } from 'lucide-react'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { EarlyAccessRecord } from '../../types'

interface EarlyAccessTabProps {
  records: EarlyAccessRecord[]
  columns: ColumnDef<EarlyAccessRecord>[]
  loading: boolean
  page: number
  totalPages: number
  typeFilter: 'ALL' | 'STUDENT' | 'LANDLORD'
  onTypeFilterChange: (type: 'ALL' | 'STUDENT' | 'LANDLORD') => void
  search: string
  onSearchChange: (search: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onPageChange: (page: number) => void
}

export const EarlyAccessTab: React.FC<EarlyAccessTabProps> = ({
  records,
  columns,
  loading,
  page,
  totalPages,
  typeFilter,
  onTypeFilterChange,
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
        {/* Type Filter Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onTypeFilterChange('ALL')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: typeFilter === 'ALL' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: typeFilter === 'ALL' ? 'var(--accent)' : 'transparent',
              color: typeFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            All Submissions
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange('STUDENT')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: typeFilter === 'STUDENT' ? '1px solid #d97757' : '1px solid var(--border)',
              background: typeFilter === 'STUDENT' ? '#d97757' : 'transparent',
              color: typeFilter === 'STUDENT' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            Student Cohort Only
          </button>
          <button
            type="button"
            onClick={() => onTypeFilterChange('LANDLORD')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: typeFilter === 'LANDLORD' ? '1px solid #166534' : '1px solid var(--border)',
              background: typeFilter === 'LANDLORD' ? '#166534' : 'transparent',
              color: typeFilter === 'LANDLORD' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            Landlords Only
          </button>
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
              placeholder="Search name, phone, city..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                width: '240px',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
            Search
          </button>
        </form>
      </div>

      <DataTable<EarlyAccessRecord>
        data={records}
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
