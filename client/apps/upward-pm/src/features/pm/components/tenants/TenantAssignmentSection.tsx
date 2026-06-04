import { User, UserPlus, Link as LinkIcon, Unlink, CheckCircle2, Info, ShieldCheck } from 'lucide-react'
import { Unit } from '../../services/propertyService'
import { useTenants, useTenantActions } from '../../hooks/useTenants'
import { useSyncToUpward } from '../../hooks/useProperties'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { useState } from 'react'

interface TenantAssignmentSectionProps {
  unit: Unit
}

export const TenantAssignmentSection: React.FC<TenantAssignmentSectionProps> = ({ unit }) => {
  const { data: tenants = [] } = useTenants()
  const { assignTenant, unassignTenant } = useTenantActions()
  const { mutate: syncToUpward, isPending: isSyncing } = useSyncToUpward()
  const [isAssigning, setIsAssigning] = useState(false)
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false)

  const handleAssign = (tenantUuid: string) => {
    assignTenant.mutate({ tenantUuid, unitUuid: unit.uuid }, {
      onSuccess: () => setIsAssigning(false)
    })
  }

  const handleUnassign = () => {
    if (unit.tenant?.uuid) {
      unassignTenant.mutate({ tenantUuid: unit.tenant.uuid, unitUuid: unit.uuid }, {
        onSuccess: () => setIsUnassignConfirmOpen(false)
      })
    }
  }

  const currentTenant = unit.tenant
  const isInvitedOrActive = currentTenant?.inviteStatus === 'ON_UPWARD' || currentTenant?.inviteStatus === 'ACCEPTED' || currentTenant?.inviteStatus === 'SENT'
  const isSynced = unit.isSynced

  return (
    <section className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Linked Tenant</h2>
        {!currentTenant && !isAssigning && (
          <button className="btn btn--secondary btn--sm" onClick={() => setIsAssigning(true)}>
            <UserPlus size={14} style={{ marginRight: 6 }} />
            Assign Tenant
          </button>
        )}
        {isAssigning && (
          <button className="btn btn--secondary btn--sm" onClick={() => setIsAssigning(false)}>
            Cancel
          </button>
        )}
      </div>

      {currentTenant ? (
        <div className="tenant-group-card" style={{ padding: '16px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="tenant-avatar-large" style={{ width: 40, height: 40, fontSize: 16 }}>
                {currentTenant.firstName?.[0]}{currentTenant.lastName?.[0]}
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{currentTenant.firstName} {currentTenant.lastName}</h4>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{currentTenant.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isSynced ? (
                <span className="badge" style={{ 
                  background: 'var(--forest-faint)', 
                  color: 'var(--forest)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10
                }}>
                  <ShieldCheck size={12} />
                  Synced to Upward Pay
                </span>
              ) : (
                <span className="badge badge--on-upward" style={{ fontSize: 10 }}>
                  {currentTenant.inviteStatus === 'ACCEPTED' ? 'Active' : currentTenant.inviteStatus?.replace('_', ' ')}
                </span>
              )}
              <button className="btn btn--danger btn--sm" onClick={() => setIsUnassignConfirmOpen(true)}>
                <Unlink size={14} />
              </button>
            </div>
          </div>

          {!isSynced && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                <Info size={16} style={{ color: 'var(--clay)', marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong>Verify & Sync:</strong> Linking this unit to the tenant's account allows them to see it in their "Properties" list and receive official payment requests. <strong>Note:</strong> Tenants can pay as guests even if they haven't set a password yet.
                </p>
              </div>
              
              <button 
                className={`btn ${isInvitedOrActive ? 'btn--primary' : 'btn--secondary'} btn--sm`} 
                style={{ width: '100%', justifyContent: 'center', gap: 8 }}
                disabled={!isInvitedOrActive || isSyncing}
                onClick={() => syncToUpward(unit.uuid)}
              >
                {isSyncing ? 'Syncing...' : (
                  <>
                    <ShieldCheck size={16} />
                    {isInvitedOrActive ? 'Verify & Sync to Upward Pay' : 'Tenant must be invited to Sync'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : isAssigning ? (
        <div className="tenant-assignment-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
          {tenants.map(tenant => (
            <div 
              key={tenant.uuid} 
              className="tenant-assign-item"
              style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => handleAssign(tenant.uuid)}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{tenant.firstName} {tenant.lastName}</span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tenant.email}</div>
              </div>
              <LinkIcon size={14} color="var(--forest)" />
            </div>
          ))}
          {tenants.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              No tenants found. Create one first in the Tenants Directory.
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '24px', border: '2px dashed var(--border)', borderRadius: '12px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No tenant assigned to this unit.</p>
        </div>
      )}

      <ConfirmationModal 
        isOpen={isUnassignConfirmOpen}
        onClose={() => setIsUnassignConfirmOpen(false)}
        onConfirm={handleUnassign}
        title="Unassign Tenant"
        message={`Are you sure you want to unassign ${currentTenant?.firstName} ${currentTenant?.lastName} from this unit?`}
        confirmText="Unassign"
        type="danger"
        isPending={unassignTenant.isPending}
      />
    </section>
  )
}
