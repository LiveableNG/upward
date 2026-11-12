import React, { useState, useMemo } from 'react'
import { Search, Download, Video, Compass, RotateCcw, Loader2 } from 'lucide-react'
import { showToast } from '@upward/client-core'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { EarlyAccessRecord } from '../../types'
import {
  matchesSessionFilter,
  matchesTrackFilter,
  parseSessionAndTrack,
  exportEarlyAccessToCsv,
} from '../../sessionExportUtils'

interface EarlyAccessTabProps {
  records: EarlyAccessRecord[]
  columns: ColumnDef<EarlyAccessRecord>[]
  loading: boolean
  page: number
  totalPages: number
  totalRecords?: number
  typeFilter: 'ALL' | 'STUDENT' | 'LANDLORD'
  onTypeFilterChange: (type: 'ALL' | 'STUDENT' | 'LANDLORD') => void
  sourceFilter?: string
  onSourceFilterChange?: (source: string) => void
  sessionFilter?: string
  onSessionFilterChange?: (session: string) => void
  onExportAll?: () => Promise<EarlyAccessRecord[]>
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
  totalRecords,
  typeFilter,
  onTypeFilterChange,
  sourceFilter = 'ALL',
  onSourceFilterChange,
  sessionFilter = 'ALL',
  onSessionFilterChange,
  onExportAll,
  search,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
}) => {
  const [internalSessionFilter, setInternalSessionFilter] = useState<string>('ALL')
  const activeSessionFilter = sessionFilter !== undefined ? sessionFilter : internalSessionFilter
  const [trackFilter, setTrackFilter] = useState<string>('ALL')
  const [isExporting, setIsExporting] = useState<boolean>(false)

  const handleSessionChange = (val: string) => {
    if (onSessionFilterChange) {
      onSessionFilterChange(val)
    } else {
      setInternalSessionFilter(val)
    }
  }

  // Detect distinct webinar and session dates present in the data
  const dynamicWebinarDates = useMemo(() => {
    const dates = new Set<string>()
    records.forEach((rec) => {
      const parsed = parseSessionAndTrack({
        interest: rec.interest,
        sessionTime: (rec as any).sessionTime,
        experienceLevel: rec.experienceLevel,
      })
      if (
        parsed.sessionDateTime &&
        parsed.sessionDateTime !== 'N/A' &&
        parsed.sessionDateTime !== 'Online Live Session' &&
        parsed.sessionDateTime !== 'Date Coming Soon' &&
        !parsed.sessionDateTime.toLowerCase().includes('21st nov')
      ) {
        dates.add(parsed.sessionDateTime)
      }
    })
    return Array.from(dates)
  }, [records])

  // Filter records in memory based on selected session & track filters
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (activeSessionFilter !== 'ALL' && !matchesSessionFilter({ interest: rec.interest, experienceLevel: rec.experienceLevel }, activeSessionFilter)) {
        return false
      }
      if (trackFilter !== 'ALL' && !matchesTrackFilter({ interest: rec.interest, experienceLevel: rec.experienceLevel }, trackFilter)) {
        return false
      }
      return true
    })
  }, [records, activeSessionFilter, trackFilter])

  const hasActiveFilters = activeSessionFilter !== 'ALL' || trackFilter !== 'ALL'

  const handleResetFilters = () => {
    handleSessionChange('ALL')
    setTrackFilter('ALL')
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      let exportList: EarlyAccessRecord[] = []

      if (onExportAll) {
        showToast('Fetching all matching records for full export...')
        const allFetched = await onExportAll()
        exportList = allFetched.filter((rec) => {
          if (activeSessionFilter !== 'ALL' && !matchesSessionFilter({ interest: rec.interest, experienceLevel: rec.experienceLevel }, activeSessionFilter)) {
            return false
          }
          if (trackFilter !== 'ALL' && !matchesTrackFilter({ interest: rec.interest, experienceLevel: rec.experienceLevel }, trackFilter)) {
            return false
          }
          return true
        })
      } else {
        exportList = filteredRecords
      }

      if (!exportList || exportList.length === 0) {
        showToast('No matching records found to export', true)
        return
      }

      const isWebinar = activeSessionFilter === 'WEBINAR_NOV_21' || activeSessionFilter.toLowerCase().includes('21st nov')
      const customFilename = isWebinar
        ? `Upward_Academy_Webinar_21Nov2026_${new Date().toISOString().split('T')[0]}.xls`
        : activeSessionFilter === 'WEBINAR_ALL'
        ? `Upward_Academy_Webinars_${new Date().toISOString().split('T')[0]}.xls`
        : undefined

      exportEarlyAccessToCsv(exportList, customFilename)
    } catch (err: any) {
      console.error('Export error:', err)
      showToast('Export failed. Please try again.', true)
    } finally {
      setIsExporting(false)
    }
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
        {sourceFilter && sourceFilter !== 'ALL' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#fbf1ed',
              border: '1px solid rgba(217, 119, 87, 0.3)',
              color: '#8A4A2A',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Filtered by Referral / Source:</span>
              <code
                style={{
                  background: '#fff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(217, 119, 87, 0.3)',
                  fontFamily: 'monospace',
                }}
              >
                {sourceFilter}
              </code>
            </div>
            <button
              type="button"
              onClick={() => onSourceFilterChange && onSourceFilterChange('ALL')}
              style={{
                background: '#fff',
                border: '1px solid rgba(217, 119, 87, 0.3)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#8A4A2A',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear Source Filter ×
            </button>
          </div>
        )}
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

            {/* Full CSV/Excel Export Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
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
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.75 : 1,
              }}
              title="Export all matching records across all pages into a cleanly styled spreadsheet"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isExporting
                ? 'Exporting All...'
                : `Export Sheet (${totalRecords !== undefined && totalRecords > 0 ? totalRecords : filteredRecords.length})`}
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
              <Video size={14} /> Filter Sessions / Webinars:
            </div>

            {/* Attendance & Session / Webinar Filter Select */}
            <select
              value={activeSessionFilter}
              onChange={(e) => handleSessionChange(e.target.value)}
              style={{
                height: '34px',
                padding: '0 28px 0 10px',
                borderRadius: '8px',
                border: activeSessionFilter !== 'ALL' ? '1.5px solid #d97757' : '1px solid var(--border)',
                background: activeSessionFilter !== 'ALL' ? '#fbf1ed' : '#fff',
                color: activeSessionFilter !== 'ALL' ? '#9a3412' : 'var(--text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Attendance Modes & Sessions</option>
              <optgroup label="Academic Webinars">
                <option value="WEBINAR_NOV_21">Webinar · Saturday 21st Nov 2026</option>
                <option value="WEBINAR_ALL">All Academic Webinars</option>
              </optgroup>
              <optgroup label="Weekly Online Live Sessions">
                <option value="ONLINE_ALL">Online · All Live Sessions</option>
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
              {dynamicWebinarDates.length > 0 && (
                <optgroup label="Other Detected Session Dates">
                  {dynamicWebinarDates.map((d) => (
                    <option key={d} value={`DATE:${d}`}>{d}</option>
                  ))}
                </optgroup>
              )}
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
              Showing <strong>{filteredRecords.length}</strong> of {totalRecords !== undefined && totalRecords > 0 ? totalRecords : records.length} total
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
