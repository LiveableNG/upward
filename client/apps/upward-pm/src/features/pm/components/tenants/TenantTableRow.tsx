import React from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      onClick={() => router.push(`/tenants/${tenant.uuid}`)}
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {isOnUpward ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              color: 'var(--forest)', 
              background: 'var(--forest-faint)', 
              padding: '6px 12px', 
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700
            }}>
              <CheckCircle2 size={14} />
              ON UPWARD
            </div>
          ) : (
            <button 
              className="btn btn--sm"
              onClick={handleInvite}
              disabled={inviteTenant.isPending}
              style={{ 
                fontSize: 12, 
                padding: '6px 16px',
                background: tenant.inviteSentAt ? 'var(--ivory-dark)' : 'var(--forest)',
                color: tenant.inviteSentAt ? 'var(--text-muted)' : 'white'
              }}
            >
              {inviteTenant.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : tenant.inviteSentAt ? (
                'Remind'
              ) : (
                'Invite'
              )}
            </button>
          )}
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: 4, 
            cursor: 'pointer' 
          }} onClick={(e) => {
            e.stopPropagation();
            onSelect?.(tenant.uuid, !isSelected);
          }}>
             <input 
               type="checkbox" 
               checked={isSelected} 
               onChange={() => {}} 
               style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--forest)' }} 
             />
          </div>
        </div>
      </td>
    </tr>
  )
}
