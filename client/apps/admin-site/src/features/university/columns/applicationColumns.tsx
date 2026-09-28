import {
  MapPin,
  Eye,
  Trash2,
  Award,
  Calendar,
  AlertCircle,
  Phone,
} from 'lucide-react'
import type { ColumnDef } from '../../../components/common/table/DataTable'
import type { UniversityApplicationRecord } from '../types'

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
    render: (row) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
        {(row.isScholarship || row.scholarshipVideoUrl) && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
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
            SCHOLARSHIP CANDIDATE
          </span>
        )}
      </div>
    ),
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
        {row.sessionTime && (
          <div
            style={{
              fontSize: '11px',
              color: '#92400e',
              background: '#fef3c7',
              padding: '1px 6px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              marginTop: '3px',
              fontWeight: 600,
            }}
          >
            <Calendar size={11} /> {row.sessionTime}
          </div>
        )}
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
    label: 'App Fee (₦5,000)',
    render: (row) => {
      const isPaid = row.feeStatus === 'PAID'
      const isRefunded = row.feeStatus === 'REFUNDED'
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            background: isPaid ? '#dcfce7' : isRefunded ? '#fef2f2' : '#fef9c3',
            color: isPaid ? '#15803d' : isRefunded ? '#991b1b' : '#a16207',
            border: `1px solid ${isPaid ? '#bbf7d0' : isRefunded ? '#fecaca' : '#fef08a'}`,
          }}
        >
          {isPaid ? '✓ PAID' : isRefunded ? 'REFUNDED' : 'PENDING'}
        </span>
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
    label: 'Applied Date',
    render: (row) => (
      <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
        {new Date(row.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </span>
    ),
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
