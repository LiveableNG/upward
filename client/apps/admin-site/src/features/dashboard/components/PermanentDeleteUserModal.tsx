import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export interface EligibleAccount {
  id: string
  dbId: number | string
  email: string
  name: string
  role: 'PROPERTY_MANAGER' | 'USER'
  disabledAt: string | Date
  daysDisabled: number
  isEligible30Days: boolean
  isBlocked: boolean
  isManuallyBlocked: boolean
}

interface PermanentDeleteUserModalProps {
  isOpen: boolean
  onClose: () => void
  account: EligibleAccount | null
  onConfirm: (account: EligibleAccount, reason: string) => Promise<void>
  deleting: boolean
}

export const PermanentDeleteUserModal: React.FC<PermanentDeleteUserModalProps> = ({
  isOpen,
  onClose,
  account,
  onConfirm,
  deleting,
}) => {
  const [reason, setReason] = useState('')

  if (!isOpen || !account) return null

  const formattedDate = account.disabledAt
    ? new Date(account.disabledAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onConfirm(account, reason)
    setReason('')
  }

  return createPortal(
    <div className="modal-overlay" style={{ alignItems: 'center', zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px', borderRadius: '16px', overflow: 'hidden', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#fff5f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
              Delete User Data?
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: account.daysDisabled >= 30 ? '#fef2f2' : '#fffbe6',
              border: `1px solid ${account.daysDisabled >= 30 ? '#fecaca' : '#ffe58f'}`,
              marginBottom: '20px',
              fontSize: '13px',
              color: account.daysDisabled >= 30 ? '#991b1b' : '#873800',
              fontWeight: 500,
            }}
          >
            {account.daysDisabled >= 30 ? (
              <span>This account has been disabled for <strong>{account.daysDisabled} days</strong> (30+ days threshold passed).</span>
            ) : (
              <span>This account has been disabled for <strong>{account.daysDisabled} days</strong>.</span>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '20px', lineHeight: 1.5 }}>
            Deleting this user's data is <strong>permanent</strong> and cannot be undone. All properties, units, session tokens, and identity records will be purged.
          </p>

          <div
            style={{
              backgroundColor: 'var(--bg-subtle, #f9fafb)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--border-color, #e5e7eb)',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Name / Business:</span>
              <strong style={{ color: 'var(--text-main)' }}>{account.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <strong style={{ color: 'var(--text-main)' }}>{account.email}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role:</span>
              <span style={{ fontWeight: 600, color: 'var(--clay, #1e293b)' }}>{account.role}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Disabled On:</span>
              <span style={{ fontWeight: 600 }}>{formattedDate}</span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Deletion Reason (Audit Record)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Account disabled 30+ days retention policy"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', height: '40px', borderRadius: '8px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ height: '42px', padding: '0 20px', borderRadius: '8px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                height: '42px',
                padding: '0 20px',
                borderRadius: '8px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              disabled={deleting}
            >
              <Trash2 size={16} />
              {deleting ? 'Permanently Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
