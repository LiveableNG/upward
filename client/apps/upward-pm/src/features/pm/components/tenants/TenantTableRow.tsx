import React from 'react'
import { Mail, Phone, Building2, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Tenant } from '../../services/tenantService'
import { useTenantActions } from '../../hooks/useTenants'
import Link from 'next/link'

interface TenantTableRowProps {
  tenant: Tenant;
  isSelected?: boolean;
  onSelect?: (uuid: string, selected: boolean) => void;
}

export const TenantTableRow: React.FC<TenantTableRowProps> = ({ tenant, isSelected, onSelect }) => {
  const { inviteTenant } = useTenantActions()

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase()
  }

  const handleInvite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inviteTenant.mutate(tenant.uuid)
  }

  const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED'
  const isProcessing = !isOnUpward && !tenant.inviteSentAt

  return (
    <tr 
      className={`tenant-table-row ${isSelected ? 'selected' : ''}`} 
      onClick={() => onSelect?.(tenant.uuid, !isSelected)}
      style={{ cursor: 'pointer' }}
    >
      <td style={{ padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            background: 'var(--dark)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0
          }}>
            {getInitials(tenant.firstName, tenant.lastName).charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 15, marginBottom: 2 }}>
              {tenant.firstName} {tenant.lastName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tenant.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '20px 32px' }}>
        {tenant.units && tenant.units.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {tenant.units.map((unit) => (
              <div key={unit.uuid} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{unit.unitName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{unit.property.name}</div>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>N/A</span>
        )}
      </td>
      <td className="col-actions" style={{ padding: '20px 32px', textAlign: 'right' }}>
        <button 
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--dark)', 
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            e.stopPropagation()
            // Toggle menu or navigate
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
            <div style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2, marginLeft: 'auto' }} />
          </div>
        </button>
      </td>
    </tr>
  )
}
