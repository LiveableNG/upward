import React from 'react'
import { Search, Plus } from 'lucide-react'
import { DataTable } from '../../../../components/common/table/DataTable'
import type { ColumnDef } from '../../../../components/common/table/DataTable'
import type { TrafficSourceRecord } from '../../types'

interface TrafficSourcesTabProps {
  sources: TrafficSourceRecord[]
  columns: ColumnDef<TrafficSourceRecord>[]
  loading: boolean
  page: number
  totalPages: number
  channelFilter: string
  onChannelFilterChange: (channel: string) => void
  search: string
  onSearchChange: (search: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onPageChange: (page: number) => void
  onOpenCreateModal: () => void
}

export const TrafficSourcesTab: React.FC<TrafficSourcesTabProps> = ({
  sources,
  columns,
  loading,
  page,
  totalPages,
  channelFilter,
  onChannelFilterChange,
  search,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
  onOpenCreateModal,
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
        {/* Filter by Channel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Channel:
          </span>
          <select
            value={channelFilter}
            onChange={(e) => onChannelFilterChange(e.target.value)}
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
            <option value="ALL">All Channels</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="TIKTOK">TikTok</option>
            <option value="TWITTER">Twitter / X</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="FLYER">Flyers & Posters</option>
            <option value="INFLUENCER">Influencer Promo</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="OTHER">Other / Direct</option>
          </select>
        </div>

        {/* Search and Create Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                placeholder="Search source name or slug..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  width: '260px',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ height: '38px' }}>
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="btn btn-primary"
            style={{
              height: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#8A4A2A',
              color: '#fff',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Plus size={16} />
            Create Source Link
          </button>
        </div>
      </div>

      <DataTable<TrafficSourceRecord>
        data={sources}
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
