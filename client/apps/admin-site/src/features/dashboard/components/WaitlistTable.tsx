import React from 'react'
import { Square, CheckSquare } from './Checkbox'
import type { WaitlistRecord } from '../types'

interface WaitlistTableProps {
  isSuperadmin: boolean
  paginatedItems: WaitlistRecord[]
  selectedWaitlistIds: Set<string>
  toggleSelectAllWaitlist: () => void
  toggleSelectWaitlist: (id: string, e: React.MouseEvent) => void
  navigate: (path: string) => void
}

export const WaitlistTable: React.FC<WaitlistTableProps> = ({
  isSuperadmin,
  paginatedItems,
  selectedWaitlistIds,
  toggleSelectAllWaitlist,
  toggleSelectWaitlist,
  navigate,
}) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
          {isSuperadmin && (
            <th style={{ padding: '16px 8px 16px 24px', width: '40px' }}>
              <button
                onClick={toggleSelectAllWaitlist}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {selectedWaitlistIds.size === paginatedItems.length && paginatedItems.length > 0 ? (
                  <CheckSquare size={18} color="var(--accent)" />
                ) : (
                  <Square size={18} />
                )}
              </button>
            </th>
          )}
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member Name</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Info</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid Amount</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined Date</th>
        </tr>
      </thead>
      <tbody>
        {paginatedItems.map((item) => (
          <tr
            key={item.id}
            onClick={() => navigate(item.converted ? `/users/${item.uuid}` : '#')}
            style={{
              borderBottom: '1px solid var(--border)',
              cursor: item.converted ? 'pointer' : 'default',
              backgroundColor: selectedWaitlistIds.has(item.id) ? 'var(--accent-faint)' : 'transparent'
            }}
            className="table-row-hover"
          >
            {isSuperadmin && (
              <td style={{ padding: '16px 8px 16px 24px' }} onClick={(e) => toggleSelectWaitlist(item.id, e)}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {selectedWaitlistIds.has(item.id) ? (
                    <CheckSquare size={18} color="var(--accent)" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </td>
            )}
            <td style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600 }}>{item.firstName} {item.lastName}</span>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '13px' }}>{item.email}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.phone}</div>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <span
                className="badge"
                style={{
                  backgroundColor: item.converted ? 'var(--success-faint)' : 'var(--warning-faint)',
                  color: item.converted ? 'var(--success)' : 'var(--warning)',
                  border: '1px solid transparent'
                }}
              >
                {item.converted ? 'Converted User' : 'In Waitlist'}
              </span>
            </td>
            <td style={{ padding: '16px 20px', fontWeight: 700 }}>
              {item.totalPaid > 0 ? `₦${item.totalPaid.toLocaleString()}` : '—'}
            </td>
            <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
        {paginatedItems.length === 0 && (
          <tr>
            <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No waitlist entries matching the criteria.</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
