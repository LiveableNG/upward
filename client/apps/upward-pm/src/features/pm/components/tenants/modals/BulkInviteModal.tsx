import React, { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Users, Mail, MessageSquare, Loader2 } from 'lucide-react'
import { useTenantActions } from '../../../hooks/useTenants'

interface BulkInviteModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTenantUuids: Set<string>
  tenants: any[]
  onSuccess?: () => void
}

export const BulkInviteModal: React.FC<BulkInviteModalProps> = ({ isOpen, onClose, selectedTenantUuids, tenants, onSuccess }) => {
  const { bulkInvite } = useTenantActions()
  const [deliveryChannel, setDeliveryChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL')

  const selectedTenantsData = useMemo(() => {
    return Array.from(selectedTenantUuids)
      .map(uuid => tenants.find(t => t.uuid === uuid))
      .filter(Boolean)
  }, [selectedTenantUuids, tenants])

  const stats = useMemo(() => {
    let withEmail = 0
    let withPhone = 0
    let withBoth = 0
    let withNeither = 0
    let alreadyOnUpward = 0

    selectedTenantsData.forEach(t => {
      if (t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED') {
        alreadyOnUpward++
        return
      }

      const hasRealEmail = !!t.email && !t.email.endsWith('@upward.com')
      const hasPhone = !!t.phone

      if (hasRealEmail && hasPhone) withBoth++
      else if (hasRealEmail) withEmail++
      else if (hasPhone) withPhone++
      else withNeither++
    })

    const totalValidEmail = withEmail + withBoth
    const totalValidPhone = withPhone + withBoth

    return { totalValidEmail, totalValidPhone, withNeither, alreadyOnUpward, total: selectedTenantsData.length }
  }, [selectedTenantsData])

  // Reset or select default channel when opened
  useEffect(() => {
    if (isOpen) {
      if (stats.totalValidEmail > 0) {
        setDeliveryChannel('EMAIL')
      } else if (stats.totalValidPhone > 0) {
        setDeliveryChannel('SMS')
      }
    }
  }, [isOpen, stats.totalValidEmail, stats.totalValidPhone])

  const handleSend = () => {
    const validUuids = selectedTenantsData.filter(t => {
      if (t.inviteStatus === 'ON_UPWARD' || t.inviteStatus === 'ACCEPTED') return false
      if (deliveryChannel === 'EMAIL') return !!t.email && !t.email.endsWith('@upward.com')
      if (deliveryChannel === 'SMS' || deliveryChannel === 'WHATSAPP') return !!t.phone
      return false
    }).map(t => t.uuid)

    if (validUuids.length === 0) {
      alert(`None of the selected tenants have a valid ${deliveryChannel === 'EMAIL' ? 'email address' : 'phone number'}.`)
      return
    }

    bulkInvite.mutate({ tenantUuids: validUuids, deliveryChannel }, {
      onSuccess: () => {
        onClose()
        onSuccess?.()
      }
    })
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Selected Tenants"
      subtitle="Choose a delivery method for your invitations."
      icon={Users}
      maxWidth={500}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={handleSend}
            disabled={bulkInvite.isPending || (deliveryChannel === 'EMAIL' && stats.totalValidEmail === 0) || ((deliveryChannel === 'SMS' || deliveryChannel === 'WHATSAPP') && stats.totalValidPhone === 0)}
          >
            {bulkInvite.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Send Invitations'}
          </button>
        </div>
      }
    >
      <div className="animate-fade-in" style={{ padding: '8px 0' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Selected Tenants Summary ({stats.total})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Valid Email Address:</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{stats.totalValidEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Valid Phone Number:</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{stats.totalValidPhone}</span>
            </div>
            {stats.withNeither > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)' }}>
                <span>Missing Contact Info:</span>
                <span style={{ fontWeight: 600 }}>{stats.withNeither}</span>
              </div>
            )}
            {stats.alreadyOnUpward > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--forest)' }}>
                <span>Already on Upward (Skipped):</span>
                <span style={{ fontWeight: 600 }}>{stats.alreadyOnUpward}</span>
              </div>
            )}
          </div>
        </div>

        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
          Select Delivery Method
        </label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label 
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
              border: `1px solid ${deliveryChannel === 'EMAIL' ? 'var(--forest)' : 'var(--border)'}`,
              borderRadius: '12px', cursor: stats.totalValidEmail === 0 ? 'not-allowed' : 'pointer',
              background: deliveryChannel === 'EMAIL' ? 'var(--forest-faint)' : 'transparent',
              opacity: stats.totalValidEmail === 0 ? 0.5 : 1
            }}
          >
            <input 
              type="radio" 
              name="delivery" 
              value="EMAIL" 
              checked={deliveryChannel === 'EMAIL'} 
              onChange={() => setDeliveryChannel('EMAIL')} 
              disabled={stats.totalValidEmail === 0}
              style={{ display: 'none' }}
            />
            <Mail size={20} color={deliveryChannel === 'EMAIL' ? 'var(--forest)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontWeight: 600 }}>Email</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send to {stats.totalValidEmail} tenants</div>
            </div>
          </label>

          <label 
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
              border: `1px solid ${deliveryChannel === 'SMS' ? 'var(--forest)' : 'var(--border)'}`,
              borderRadius: '12px', cursor: stats.totalValidPhone === 0 ? 'not-allowed' : 'pointer',
              background: deliveryChannel === 'SMS' ? 'var(--forest-faint)' : 'transparent',
              opacity: stats.totalValidPhone === 0 ? 0.5 : 1
            }}
          >
            <input 
              type="radio" 
              name="delivery" 
              value="SMS" 
              checked={deliveryChannel === 'SMS'} 
              onChange={() => setDeliveryChannel('SMS')} 
              disabled={stats.totalValidPhone === 0}
              style={{ display: 'none' }}
            />
            <MessageSquare size={20} color={deliveryChannel === 'SMS' ? 'var(--forest)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontWeight: 600 }}>SMS</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send to {stats.totalValidPhone} tenants</div>
            </div>
          </label>

          <label 
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
              border: `1px solid ${deliveryChannel === 'WHATSAPP' ? 'var(--forest)' : 'var(--border)'}`,
              borderRadius: '12px', cursor: stats.totalValidPhone === 0 ? 'not-allowed' : 'pointer',
              background: deliveryChannel === 'WHATSAPP' ? 'var(--forest-faint)' : 'transparent',
              opacity: stats.totalValidPhone === 0 ? 0.5 : 1
            }}
          >
            <input 
              type="radio" 
              name="delivery" 
              value="WHATSAPP" 
              checked={deliveryChannel === 'WHATSAPP'} 
              onChange={() => setDeliveryChannel('WHATSAPP')} 
              disabled={stats.totalValidPhone === 0}
              style={{ display: 'none' }}
            />
            <MessageSquare size={20} color={deliveryChannel === 'WHATSAPP' ? 'var(--forest)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontWeight: 600 }}>WhatsApp</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send to {stats.totalValidPhone} tenants</div>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  )
}
