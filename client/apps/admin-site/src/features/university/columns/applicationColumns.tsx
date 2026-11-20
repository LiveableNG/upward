import {
  MapPin,
  Eye,
  Trash2,
  Award,
  AlertCircle,
  Phone,
  Compass,
  Video,
} from 'lucide-react'
import type { ColumnDef } from '../../../components/common/table/DataTable'
import type { UniversityApplicationRecord } from '../types'
import { getTrackBadgeMeta, parseSessionAndTrack, getPaymentAndBalanceMeta } from '../sessionExportUtils'

interface ApplicationColumnsOptions {
  onSelect: (row: UniversityApplicationRecord) => void
  onDelete?: (row: UniversityApplicationRecord) => void
  isDeveloper: boolean
}

export const getApplicationColumns = ({
  onSelect,
  onDelete,
  isDeveloper,
}: ApplicationColumnsOptions): ColumnDef<UniversityApplicationRecord>[] => [
  {
    key: 'applicant',
    label: 'Applicant Name & Email',
    render: (row) => {
      const rawTrack =
        row.track ||
        row.notes?.match(/\[Track:\s*([^\]]+)\]/i)?.[1] ||
        row.experienceLevel?.match(/\[(Track\s*[A-D12][^\]]*)\]/i)?.[1] ||
        row.goals?.match(/Track:\s*([^\n,]+)/i)?.[1] ||
        ''
      const parsedTrack = parseSessionAndTrack({
        track: rawTrack,
        experienceLevel: row.experienceLevel,
        interest: row.notes,
      })
      const badgeMeta = getTrackBadgeMeta(parsedTrack.trackCode)

      return (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: badgeMeta.background,
                color: badgeMeta.color,
                border: `1px solid ${badgeMeta.border}`,
              }}
            >
              <Compass size={11} />
              {badgeMeta.label}
            </span>
            {row.scholarshipVideoUrl ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                }}
              >
                <Video size={11} />
                VIDEO SUBMITTED
              </span>
            ) : row.feeStatus === 'PAID' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                }}
              >
                <Video size={11} />
                VIDEO PENDING
              </span>
            ) : null}
            {row.isScholarship && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                }}
              >
                <Award size={11} />
                SCHOLARSHIP
              </span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    key: 'contact',
    label: 'WhatsApp',
    render: (row) => {
      const rawPhone = row.whatsapp || ''
      const cleanPhone = rawPhone.replace(/[^0-9+]/g, '')
      return (
        <a
          href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#25D366',
            fontWeight: 500,
            fontSize: '13px',
            textDecoration: 'none',
          }}
          onClick={(e) => {
            if (!cleanPhone) e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Phone size={14} />
          {rawPhone || 'N/A'}
        </a>
      )
    },
  },
  {
    key: 'city',
    label: 'City & Age',
    render: (row) => (
      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={13} color="var(--accent)" />
          <b>{row.city}</b>
        </span>
        <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
        <span>{row.ageBracket}</span>
      </div>
    ),
  },
  {
    key: 'occupation',
    label: 'Occupation & Exp',
    render: (row) => (
      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        <div>
          <b>{row.occupation || 'Not specified'}</b>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          {row.experienceLevel || 'Beginner'}
        </div>
        {row.sessionTime && (() => {
          const parsed = parseSessionAndTrack({ sessionTime: row.sessionTime })
          return (
            <div
              style={{
                fontSize: '11px',
                color: '#92400e',
                background: '#fef3c7',
                padding: '2px 7px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px',
                fontWeight: 600,
                border: '1px solid #fde68a',
              }}
              title={row.sessionTime}
            >
              {parsed.attendanceMode === 'Online' ? <Video size={11} /> : <MapPin size={11} />}
              {parsed.sessionBadgeText}
            </div>
          )
        })()}
      </div>
    ),
  },
  {
    key: 'abVariant',
    label: 'A/B Test Variant',
    render: (row) => {
      const isVariantB = row.abVariant === 'B'
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            background: isVariantB ? '#f3e8ff' : '#eff6ff',
            color: isVariantB ? '#7e22ce' : '#1d4ed8',
            border: `1px solid ${isVariantB ? '#d8b4fe' : '#bfdbfe'}`,
          }}
        >
          {isVariantB ? 'Variant B (Post-Reg)' : 'Variant A (Upfront)'}
        </span>
      )
    },
  },
  {
    key: 'feeStatus',
    label: 'Payment & Balance Status',
    render: (row) => {
      const meta = getPaymentAndBalanceMeta(row)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span
            style={{
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              background: meta.background,
              color: meta.color,
              border: `1px solid ${meta.border}`,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
            }}
          >
            {meta.badgeLabel}
          </span>
          {meta.detailText && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.25, maxWidth: '200px' }}>
              {meta.detailText}
            </span>
          )}
        </div>
      )
    },
  },
  {
    key: 'status',
    label: 'Application Status',
    render: (row) => {
      const isPaid = row.feeStatus === 'PAID'
      const isStageDropoff = !isPaid && row.status === 'SUBMITTED'
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background:
                row.status === 'SUBMITTED'
                  ? '#fff7ed'
                  : row.status === 'ADMITTED'
                  ? '#f0f7f2'
                  : '#f3f4f6',
              color:
                row.status === 'SUBMITTED'
                  ? '#c2410c'
                  : row.status === 'ADMITTED'
                  ? '#166534'
                  : '#4b5563',
              border: `1px solid ${
                row.status === 'SUBMITTED'
                  ? '#ffedd5'
                  : row.status === 'ADMITTED'
                  ? '#bbf7d0'
                  : '#e5e7eb'
              }`,
            }}
          >
            {row.status}
          </span>
          {isStageDropoff && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#b45309',
                background: '#fef3c7',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #fde68a',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <AlertCircle size={10} /> Stage 2/3 Drop-off (Fee Unpaid)
            </span>
          )}
        </div>
      )
    },
  },
  {
    key: 'createdAt',
    label: 'Applied Date & Time',
    render: (row) => {
      const d = new Date(row.createdAt)
      const dateStr = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      return (
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {dateStr}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {timeStr}
          </div>
        </div>
      )
    },
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onSelect(row)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
        >
          <Eye size={14} />
          View Application
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
            title="Delete Application"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    ),
  },
]
