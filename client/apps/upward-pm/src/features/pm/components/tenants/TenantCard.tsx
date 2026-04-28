import React from 'react'
import { Mail, Phone, Building2, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Tenant } from '../../services/tenantService'
import { useTenantActions } from '../../hooks/useTenants'
import Link from 'next/link'

interface TenantCardProps {
  tenant: Tenant;
  isSelected?: boolean;
  onSelect?: (uuid: string, selected: boolean) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({ tenant, isSelected, onSelect }) => {
  const { inviteTenant } = useTenantActions()

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase()
  }

  const handleInvite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inviteTenant.mutate(tenant.uuid)
  }

  const isInvited = tenant.inviteStatus === 'SENT'
  const isOnUpward = tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED'

  return (
    <div className={`tenant-group-card ${isSelected ? 'tenant-group-card--selected' : ''}`}>
      <div className="tenant-group-card__header">
        <div className="tenant-info-main">
          {onSelect && (
            <div className="tenant-card__checkbox">
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={(e) => onSelect(tenant.uuid, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="tenant-avatar-large">
            {getInitials(tenant.firstName, tenant.lastName)}
          </div>
          <div>
            <h3>{tenant.firstName} {tenant.lastName}</h3>
            <div className="tenant-meta">
              {tenant.email && (
                <span><Mail size={12} /> {tenant.email}</span>
              )}
              {tenant.phone && (
                <span><Phone size={12} /> {tenant.phone}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="tenant-card-actions">
          {isOnUpward ? (
            <span className="badge badge--on-upward">
              <CheckCircle2 size={12} style={{ marginRight: 4 }} />
              On Upward
            </span>
          ) : isInvited ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge badge--sent">Invite Sent</span>
              <button 
                className="btn btn--secondary btn--sm"
                onClick={handleInvite}
                disabled={inviteTenant.isPending}
              >
                {inviteTenant.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Resend'}
              </button>
            </div>
          ) : (
            <button 
              className="btn btn--primary btn--sm" 
              onClick={handleInvite}
              disabled={inviteTenant.isPending}
            >
              {inviteTenant.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} style={{ marginRight: 6 }} />
                  Send Invite
                </>
              )}
            </button>
          )}
          <Link href={`/tenants/${tenant.uuid}`} className="btn btn--secondary btn--sm">
            View Profile
          </Link>
        </div>
      </div>

      <div className="tenant-units-section">
        <p className="section-label">Assigned Units ({tenant.units?.length || 0})</p>
        <div className="tenant-units-grid">
          {tenant.units?.map((unit) => (
            <Link key={unit.uuid} href={`/properties/units/${unit.uuid}`} className="tenant-unit-pill">
              <div className="tenant-unit-pill__icon">
                <Building2 size={14} />
              </div>
              <div className="tenant-unit-pill__text">
                <strong>Unit {unit.unitName}</strong>
                <span>{unit.property.name}</span>
              </div>
              <span className={`badge badge--xs badge--${unit.status.toLowerCase()}`}>
                {unit.status.replace('-', ' ')}
              </span>
            </Link>
          ))}
          {(!tenant.units || tenant.units.length === 0) && (
            <span className="text-muted" style={{ fontSize: '13px' }}>No units assigned</span>
          )}
        </div>
      </div>
    </div>
  )
}
