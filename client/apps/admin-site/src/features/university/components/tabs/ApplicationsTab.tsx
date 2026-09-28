import React from 'react'
import { Search } from 'lucide-react'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { UniversityApplicationRecord } from '../../types'

interface ApplicationsTabProps {
  applications: UniversityApplicationRecord[]
  columns: ColumnDef<UniversityApplicationRecord>[]
  loading: boolean
  page: number
  totalPages: number
  totalApplications: number
  search: string
  onSearchChange: (search: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onPageChange: (page: number) => void
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  applications,
  columns,
  loading,
  page,
  totalPages,
  totalApplications,
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
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Full Cohort Applications ({totalApplications})
        </div>
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
              placeholder="Search applications..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                paddingLeft: '36px',
                paddingRight: '12px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                width: '280px',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
            Search
          </button>
        </form>
      </div>

      <DataTable<UniversityApplicationRecord>
        data={applications}
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
