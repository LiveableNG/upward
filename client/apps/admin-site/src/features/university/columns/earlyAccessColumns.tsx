import {
  GraduationCap,
  Building,
  MapPin,
  Eye,
  Trash2,
  Calendar,
  Layers,
  Phone,
} from 'lucide-react'
import type { ColumnDef } from '../../../components/common/table/DataTable'
import type { EarlyAccessRecord } from '../types'

interface EarlyAccessColumnsOptions {
  onSelect: (row: EarlyAccessRecord) => void
  onDelete?: (row: EarlyAccessRecord) => void
  isDeveloper: boolean
}

export const getEarlyAccessColumns = ({
  onSelect,
  onDelete,
  isDeveloper,
}: EarlyAccessColumnsOptions): ColumnDef<EarlyAccessRecord>[] => [
  {
    key: 'type',
    label: 'Application Type',
    render: (row) => {
      const isStudent = row.type === 'STUDENT'
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: isStudent ? '#fbf1ed' : '#f0f7f2',
            color: isStudent ? '#d97757' : '#166534',
            border: `1px solid ${isStudent ? 'rgba(217, 119, 87, 0.2)' : 'rgba(22, 101, 52, 0.2)'}`,
          }}
        >
          {isStudent ? <GraduationCap size={14} /> : <Building size={14} />}
          {isStudent ? 'Student Cohort' : 'Landlord Programme'}
        </span>
      )
    },
  },
  {
    key: 'applicant',
    label: 'Applicant',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
        {row.email ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            No email provided
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'contact',
    label: 'WhatsApp / Contact',
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
    label: 'City',
    render: (row) => (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12.5px',
          color: 'var(--text-secondary)',
        }}
      >
        <MapPin size={13} color="var(--accent)" />
        {row.city}
      </span>
    ),
  },
  {
    key: 'details',
    label: 'Program Details',
    render: (row) => {
      if (row.type === 'STUDENT') {
        return (
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <div>
              Age: <b>{row.ageBracket || 'N/A'}</b>
              <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
              Exp: <b>{row.experienceLevel || 'N/A'}</b>
            </div>
            {row.experienceLevel && row.experienceLevel.includes('Stage 1') ? (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  color: '#c2410c',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fff7ed',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ffedd5',
                }}
              >
                <Layers size={11} /> Drop-off Stage 1: Basic Info
              </div>
            ) : row.interest ? (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11.5px',
                  color: '#b45309',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid #fde68a',
                }}
              >
                <Calendar size={11} /> {row.interest}
              </div>
            ) : null}
          </div>
        )
      }
      return (
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          <span>
            Properties: <b>{row.propertyCount || 'N/A'}</b>
          </span>
          <span style={{ margin: '0 6px', color: 'var(--border)' }}>•</span>
          <span>
            Status: <b>{row.landlordStatus || 'N/A'}</b>
          </span>
        </div>
      )
    },
  },
  {
    key: 'createdAt',
    label: 'Submitted Date',
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
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(row)
          }}
        >
          <Eye size={13} />
          View
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
            title="Delete Record"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    ),
  },
]
