import {
  Briefcase,
  MapPin,
  Phone,
  Eye,
  Trash2,
  Users,
} from 'lucide-react'
import type { ColumnDef } from '../../../components/common/table/DataTable'
import type { UniversityHireRequestRecord } from '../types'

interface HireRequestColumnsOptions {
  onSelect: (row: UniversityHireRequestRecord) => void
  onDelete?: (row: UniversityHireRequestRecord) => void
  isDeveloper: boolean
}

export const getHireRequestColumns = ({
  onSelect,
  onDelete,
  isDeveloper,
}: HireRequestColumnsOptions): ColumnDef<UniversityHireRequestRecord>[] => [
  {
    key: 'company',
    label: 'Company & Contact Person',
    render: (row) => (
      <div>
        <div
          style={{
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Briefcase size={14} color="#8A4A2A" />
          {row.companyName}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          <b>{row.contactName}</b>
          {row.contactRole ? ` • ${row.contactRole}` : ''}
        </div>
      </div>
    ),
  },
  {
    key: 'contact',
    label: 'Contact Info',
    render: (row) => {
      const cleanPhone = (row.phone || '').replace(/[^0-9+]/g, '')
      return (
        <div>
          {row.phone && (
            <div>
              <a
                href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#16a34a',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <Phone size={12} /> {row.phone}
              </a>
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {row.email}
          </div>
        </div>
      )
    },
  },
  {
    key: 'location',
    label: 'Industry & City',
    render: (row) => (
      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.industry}</div>
        <div
          style={{
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            marginTop: '2px',
          }}
        >
          <MapPin size={11} color="var(--accent)" />
          {row.city}
        </div>
      </div>
    ),
  },
  {
    key: 'placement',
    label: 'Placement & Openings',
    render: (row) => {
      const pType = (row.placementType || 'FULL_TIME').replace(/_/g, ' ')
      return (
        <div>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              textTransform: 'capitalize',
            }}
          >
            {pType}
          </span>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <Users size={11} style={{ display: 'inline', marginRight: '3px' }} />
            {row.openingsCount} {Number(row.openingsCount) === 1 ? 'Opening' : 'Openings'}
          </div>
        </div>
      )
    },
  },
  {
    key: 'roles',
    label: 'Roles Needed',
    render: (row) => {
      const roles = Array.isArray(row.rolesNeeded) ? row.rolesNeeded : []
      if (roles.length === 0) {
        return <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Any role</span>
      }
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
          {roles.map((r, i) => (
            <span
              key={i}
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    key: 'status',
    label: 'Hiring Status',
    render: (row) => {
      let bg = '#fef3c7'
      let color = '#b45309'
      let border = '#fde68a'
      let label = 'Pending Review'

      if (row.status === 'CONTACTED') {
        bg = '#dbeafe'
        color = '#1d4ed8'
        border = '#bfdbfe'
        label = 'Contacted'
      } else if (row.status === 'MATCHED') {
        bg = '#dcfce7'
        color = '#15803d'
        border = '#bbf7d0'
        label = 'Talent Matched'
      } else if (row.status === 'CLOSED') {
        bg = '#f3f4f6'
        color = '#6b7280'
        border = '#e5e7eb'
        label = 'Closed'
      }

      return (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: bg,
            color: color,
            border: `1px solid ${border}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
        </span>
      )
    },
  },
  {
    key: 'createdAt',
    label: 'Submitted Date',
    render: (row) => (
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onSelect(row)}
          style={{
            padding: '5px 11px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="View Details"
        >
          <Eye size={13} />
          View
        </button>
        {isDeveloper && onDelete && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onDelete(row)}
            style={{
              padding: '5px 8px',
              color: '#dc2626',
              borderColor: '#fecaca',
            }}
            title="Delete Request (Developer Only)"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    ),
  },
]
