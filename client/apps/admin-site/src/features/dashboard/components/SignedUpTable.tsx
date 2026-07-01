import React from 'react'
import type { SignedUpRecord } from '../types'

interface SignedUpTableProps {
  paginatedItems: SignedUpRecord[]
  navigate: (path: string) => void
}

export const SignedUpTable: React.FC<SignedUpTableProps> = ({ paginatedItems, navigate }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>User details</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mode</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Status</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signup Date</th>
        </tr>
      </thead>
      <tbody>
        {paginatedItems.map((user) => (
          <tr
            key={user.id}
            onClick={() => navigate(`/users/${user.uuid}`)}
            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            className="table-row-hover"
          >
            <td style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600, display: 'block' }}>{user.firstName} {user.lastName}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email} • {user.phone}</span>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '13px' }}>{user.isWaitlist ? 'Waitlist Converted' : 'Direct Signup'}</span>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <span
                className="badge"
                style={{
                  backgroundColor: user.hasPaid ? 'var(--success-faint)' : 'var(--surface-hover)',
                  color: user.hasPaid ? 'var(--success)' : 'var(--text-muted)'
                }}
              >
                {user.hasPaid ? 'Paid' : 'Unpaid'}
              </span>
            </td>
            <td style={{ padding: '16px 20px', fontWeight: 700 }}>
              {user.totalPaid > 0 ? `₦${user.totalPaid.toLocaleString()}` : '—'}
            </td>
            <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(user.createdAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
        {paginatedItems.length === 0 && (
          <tr>
            <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No signed-up users found.</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
