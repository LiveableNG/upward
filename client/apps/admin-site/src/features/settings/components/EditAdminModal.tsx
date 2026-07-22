import React, { useState, useEffect } from 'react'
import { AlertCircle, Edit3 } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'

export interface EditAdminModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (admin: { phone: string; receivesSystemAlerts: boolean }) => void
  admin: { id: string; email: string; phone: string; receivesSystemAlerts: boolean } | null
  error?: string
}

export const EditAdminModal: React.FC<EditAdminModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  admin,
  error,
}) => {
  const [formData, setFormData] = useState({
    phone: '',
    receivesSystemAlerts: false,
  })

  useEffect(() => {
    if (isOpen && admin) {
      setFormData({
        phone: admin.phone || '',
        receivesSystemAlerts: admin.receivesSystemAlerts || false,
      })
    }
  }, [isOpen, admin])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const footerActions = (
    <>
      <button
        type="button"
        onClick={onClose}
        style={{
          flex: 1,
          padding: '12px',
          border: '1px solid var(--border)',
          background: 'var(--white)',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        style={{
          flex: 1,
          padding: '12px',
          border: 'none',
          background: 'var(--accent)',
          color: 'var(--white)',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        Save Changes
      </button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Edit3 size={20} />}
      title="Edit Admin Details"
      description={`Editing details for ${admin?.email || 'this admin'}`}
      maxWidth="480px"
      footerActions={footerActions}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
      >
        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Phone Number
          </label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1234567890"
            style={{
              width: '100%',
              padding: '11px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '14px',
            }}
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Must be in international format (e.g. +1234567890). Leave blank to remove.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <input
            type="checkbox"
            id="receivesSystemAlerts"
            checked={formData.receivesSystemAlerts}
            onChange={(e) => setFormData({ ...formData, receivesSystemAlerts: e.target.checked })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label
            htmlFor="receivesSystemAlerts"
            style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
          >
            Receive System Alerts
          </label>
        </div>
      </form>
    </Modal>
  )
}
