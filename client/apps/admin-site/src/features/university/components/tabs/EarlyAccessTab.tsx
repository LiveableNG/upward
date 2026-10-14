import React, { useState, useMemo } from 'react'
import { Search, Download, Video, Compass, RotateCcw } from 'lucide-react'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { EarlyAccessRecord } from '../../types'
import {
  matchesSessionFilter,
  matchesTrackFilter,
  exportEarlyAccessToCsv,
} from '../../sessionExportUtils'

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
  const [sessionFilter, setSessionFilter] = useState<string>('ALL')
  const [trackFilter, setTrackFilter] = useState<string>('ALL')

  // Filter records in memory based on selected session & track filters
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (sessionFilter !== 'ALL' && !matchesSessionFilter({ interest: rec.interest, experienceLevel: rec.experienceLevel }, sessionFilter)) {
        return false
      }
      if (trackFilter !== 'ALL' && !matchesTrackFilter({ interest: rec.interest, experienceLevel: rec.experienceLevel }, trackFilter)) {
        return false
      }
      return true
    })
  }, [records, sessionFilter, trackFilter])

  const hasActiveFilters = sessionFilter !== 'ALL' || trackFilter !== 'ALL'

  const handleResetFilters = () => {
    setSessionFilter('ALL')
    setTrackFilter('ALL')
  }

  const handleExport = () => {
    exportEarlyAccessToCsv(filteredRecords)
  }

  return (
    <>
      <div
        className="card"
        style={{
          padding: '16px',
          borderRadius: '14px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Top Row: Type Pills & Search & Export */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Type Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onTypeFilterChange('ALL')}
              style={{
                padding: '7px 14px',
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
                padding: '7px 14px',
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
                padding: '7px 14px',
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

          {/* Right Action Tools: Search & Export CSV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
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
                    paddingLeft: '34px',
                    paddingRight: '12px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    width: '210px',
                  }}
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>
                Search
              </button>
            </form>

            {/* Clean CSV Export Button */}
            <button
              type="button"
              onClick={handleExport}
              className="btn btn-primary"
              style={{
                height: '36px',
                padding: '0 14px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px',
                background: 'var(--accent, #8A4A2A)',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Export filtered records into cleaned, separated CSV spreadsheet columns"
            >
              <Download size={14} />
              Export CSV ({filteredRecords.length})
            </button>
          </div>
        </div>

        {/* Bottom Row: Detailed Session & Track Filters (shown for all/student) */}
        {typeFilter !== 'LANDLORD' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              <Video size={14} /> Filter Sessions:
            </div>

            {/* Attendance & Session Filter Select */}
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              style={{
                height: '34px',
                padding: '0 28px 0 10px',
                borderRadius: '8px',
                border: sessionFilter !== 'ALL' ? '1.5px solid #d97757' : '1px solid var(--border)',
                background: sessionFilter !== 'ALL' ? '#fbf1ed' : '#fff',
                color: sessionFilter !== 'ALL' ? '#9a3412' : 'var(--text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Attendance Modes & Sessions</option>
              <optgroup label="Online Sessions (Weekly)">
                <option value="ONLINE_ALL">Online · All Live Webinars</option>
                <option value="ONLINE_TUE">Online · Tuesdays (6:00 PM)</option>
                <option value="ONLINE_SAT">Online · Saturdays (9:00 AM)</option>
              </optgroup>
              <optgroup label="In-Person Events (Physical)">
                <option value="PHYSICAL_ALL">In-Person · All Physical Cities</option>
                <option value="PHYSICAL_ABUJA">In-Person · Abuja (CBD)</option>
                <option value="PHYSICAL_PH">In-Person · Port Harcourt (GRA 2)</option>
                <option value="PHYSICAL_LAGOS">In-Person · Lagos (Yaba Tech Hub)</option>
                <option value="PHYSICAL_IBADAN">In-Person · Oyo / Ibadan (Bodija)</option>
              </optgroup>
              <option value="NO_SESSION">No Session RSVP / None</option>
            </select>

            {/* Track Filter Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px' }}>
              <Compass size={14} /> Track:
            </div>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              style={{
                height: '34px',
                padding: '0 28px 0 10px',
                borderRadius: '8px',
                border: trackFilter !== 'ALL' ? '1.5px solid #d97757' : '1px solid var(--border)',
                background: trackFilter !== 'ALL' ? '#fbf1ed' : '#fff',
                color: trackFilter !== 'ALL' ? '#9a3412' : 'var(--text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Tracks</option>
              <option value="TRACK_1">Track 1: Starting From Zero</option>
              <option value="TRACK_2">Track 2: Already Started</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
                style={{
                  height: '32px',
                  padding: '0 10px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-muted)',
                }}
              >
                <RotateCcw size={12} /> Reset Filters
              </button>
            )}

            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Showing <strong>{filteredRecords.length}</strong> of {records.length} on this page
            </span>
          </div>
        )}
      </div>

      <DataTable<EarlyAccessRecord>
        data={filteredRecords}
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
