import React from 'react'
import type { InvitedRecord } from '../types'

interface InvitedTableProps {
  paginatedItems: InvitedRecord[]
  navigate: (path: string) => void
}

const getInvitedBadgeStyle = (status: string) => {
  switch (status) {
    case 'SIGNED_UP_PAID':
      return { backgroundColor: 'var(--success-faint)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.15)' }
    case 'GUEST_PAID':
      return { backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.15)' }
    case 'INVITED_SIGNED_UP':
      return { backgroundColor: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.15)' }
    case 'INVITED_PENDING':
      return { backgroundColor: 'var(--warning-faint)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.15)' }
    default:
      return { backgroundColor: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
  }
}

const getInvitedLabel = (status: string) => {
  switch (status) {
    case 'SIGNED_UP_PAID':
      return 'Signed Up (Paid)'
    case 'GUEST_PAID':
      return 'Guest (Paid)'
    case 'INVITED_SIGNED_UP':
      return 'Invited & Signed Up'
    case 'INVITED_PENDING':
      return 'Invited (Pending)'
    default:
      return status
  }
}

export const InvitedTable: React.FC<InvitedTableProps> = ({ paginatedItems, navigate }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tenant details</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Property Manager Origin</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invite Date</th>
        </tr>
      </thead>
      <tbody>
        {paginatedItems.map((tenant) => (
          <tr
            key={tenant.id}
            onClick={() => navigate(`/users/${tenant.uuid}`)}
            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            className="table-row-hover"
          >
            <td style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600, display: 'block' }}>{tenant.firstName ? `${tenant.firstName} ${tenant.lastName}` : 'Invite Placeholder'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tenant.email} • {tenant.phone}</span>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <span className="badge" style={getInvitedBadgeStyle(tenant.status)}>
                {getInvitedLabel(tenant.status)}
              </span>
            </td>
            <td style={{ padding: '16px 20px' }} onClick={(e) => {
              if (tenant.pmUuid) {
                e.stopPropagation()
                navigate(`/pms/${tenant.pmUuid}`)
              }
            }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: tenant.pmUuid ? 'var(--accent)' : 'var(--text)',
                  textDecoration: tenant.pmUuid ? 'underline' : 'none'
                }}
              >
                {tenant.pmName}
              </span>
            </td>
            <td style={{ padding: '16px 20px', fontWeight: 700 }}>
              {tenant.totalPaid > 0 ? `₦${tenant.totalPaid.toLocaleString()}` : '—'}
            </td>
            <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(tenant.createdAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
        {paginatedItems.length === 0 && (
          <tr>
            <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No invited tenant records found.</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
