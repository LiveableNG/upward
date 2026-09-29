import {
  Copy,
  Check,
  Eye,
  Trash2,
} from 'lucide-react'
import type { ColumnDef } from '../../../components/common/table/DataTable'
import type { TrafficSourceRecord } from '../types'
import { getChannelBadgeTheme } from '../utils'

interface TrafficColumnsOptions {
  onVisitsLog: (row: TrafficSourceRecord) => void
  onToggleActive: (row: TrafficSourceRecord) => void
  onCopyLink: (identifier: string, targetUrl?: string) => void
  copiedId: string | null
  onDelete?: (row: TrafficSourceRecord) => void
  isDeveloper: boolean
}

export const getTrafficColumns = ({
  onVisitsLog,
  onToggleActive,
  onCopyLink,
  copiedId,
  onDelete,
  isDeveloper,
}: TrafficColumnsOptions): ColumnDef<TrafficSourceRecord>[] => [
  {
    key: 'name',
    label: 'Campaign / Source Name',
    render: (row) => {
      const theme = getChannelBadgeTheme(row.channel)
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
              {row.name}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                background: theme.bg,
                color: theme.color,
                border: `1px solid ${theme.border}`,
                textTransform: 'uppercase',
              }}
            >
              {row.channel}
            </span>
          </div>
          {row.description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {row.description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'identifier',
    label: 'Tracking Identifier & Link',
    render: (row) => {
      const isCopied = copiedId === row.identifier
      const linkPath =
        row.targetUrl && row.targetUrl.includes('/apply')
          ? `/academy/apply?ref=${row.identifier}`
          : `/academy/${row.identifier}`
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code
            style={{
              fontSize: '12px',
              background: '#f8fafc',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              color: '#8A4A2A',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            {linkPath}
          </code>
          <button
            type="button"
            onClick={() => onCopyLink(row.identifier, row.targetUrl)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              border: isCopied ? '1px solid #bbf7d0' : '1px solid var(--border)',
              background: isCopied ? '#f0fdf4' : '#ffffff',
              color: isCopied ? '#166534' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
            title="Copy tracking link"
          >
            {isCopied ? <Check size={12} color="#166534" /> : <Copy size={12} />}
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )
    },
  },
  {
    key: 'uniqueViews',
    label: 'Unique Visitors',
    render: (row) => (
      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#8A4A2A' }}>
          {row.uniqueViews.toLocaleString()}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {row.totalViews} total views
        </div>
      </div>
    ),
  },
  {
    key: 'conversions',
    label: 'Conversions',
    render: (row) => (
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: '13.5px',
            color: row.conversions > 0 ? '#15803d' : 'var(--text-primary)',
          }}
        >
          {row.conversions}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>leads & apps</div>
      </div>
    ),
  },
  {
    key: 'conversionRate',
    label: 'Conv. Rate',
    render: (row) => {
      const rate = row.conversionRate || 0
      const isHigh = rate >= 5
      return (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: isHigh ? '#dcfce7' : '#f3f4f6',
            color: isHigh ? '#15803d' : '#4b5563',
            border: `1px solid ${isHigh ? '#bbf7d0' : '#e5e7eb'}`,
          }}
        >
          {rate}%
        </span>
      )
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <button
        type="button"
        onClick={() => onToggleActive(row)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '11.5px',
          fontWeight: 600,
          cursor: 'pointer',
          border: `1px solid ${row.isActive ? '#bbf7d0' : '#fecaca'}`,
          background: row.isActive ? '#f0fdf4' : '#fef2f2',
          color: row.isActive ? '#166534' : '#dc2626',
        }}
        title="Click to toggle active state"
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: row.isActive ? '#16a34a' : '#dc2626',
          }}
        />
        {row.isActive ? 'Active' : 'Paused'}
      </button>
    ),
  },
  {
    key: 'lastVisitedAt',
    label: 'Last Visit',
    render: (row) => (
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {row.lastVisitedAt
          ? new Date(row.lastVisitedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'No visits yet'}
      </span>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', gap: '4px', alignItems: 'center' }}
          onClick={(e) => {
            e.stopPropagation()
            onVisitsLog(row)
          }}
          title="View recent visitor log"
        >
          <Eye size={13} />
          Visits Log
        </button>
        {isDeveloper && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(row)
            }}
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="Delete Tracking Source"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    ),
  },
]
