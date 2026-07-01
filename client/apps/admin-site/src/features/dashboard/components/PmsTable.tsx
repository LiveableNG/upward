import React from 'react'
import { Settings } from 'lucide-react'
import type { PmRecord, FeeOverride } from '../types'

interface PmsTableProps {
  paginatedItems: PmRecord[]
  navigate: (path: string) => void
  overrides: FeeOverride[]
  setSelectedPmOverride: (pm: PmRecord) => void
  setPmOverrideFeeInput: (fee: string) => void
}

export const PmsTable: React.FC<PmsTableProps> = ({
  paginatedItems,
  navigate,
  overrides,
  setSelectedPmOverride,
  setPmOverrideFeeInput,
}) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Business Details</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Properties / Units</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Revenue Generated</th>
          <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {paginatedItems.map((pm) => (
          <tr
            key={pm.id}
            onClick={() => navigate(`/pms/${pm.uuid}`)}
            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            className="table-row-hover"
          >
            <td style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 700, display: 'block', fontSize: '14px' }}>{pm.businessName}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Manager: {pm.firstName} {pm.lastName}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{pm.email} • {pm.phone}</span>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '13px' }}>Properties: <strong>{pm.propertiesCount}</strong></div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Units: {pm.unitsCount}</div>
            </td>
            <td style={{ padding: '16px 20px' }}>
              <span
                className="badge"
                style={{
                  backgroundColor: pm.isVerified ? 'var(--success-faint)' : 'var(--error-faint)',
                  color: pm.isVerified ? 'var(--success)' : 'var(--error)'
                }}
              >
                {pm.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </td>
            <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--success)' }}>
              ₦{pm.totalGenerated.toLocaleString()}
            </td>
            <td style={{ padding: '16px 20px' }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setSelectedPmOverride(pm)
                  const match = overrides.find((o) => o.targetType === 'PM' && o.targetId === pm.uuid)
                  setPmOverrideFeeInput(match ? String(match.fee) : '2000')
                }}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Settings size={12} /> Fee Override
              </button>
            </td>
          </tr>
        ))}
        {paginatedItems.length === 0 && (
          <tr>
            <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No Property Managers registered.</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
