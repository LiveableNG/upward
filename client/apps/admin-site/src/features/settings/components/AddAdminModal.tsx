import React, { useState } from 'react'
import { UserPlus, Mail, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Modal } from '../../../components/common/modal/Modal'

export interface AddAdminModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (admin: { email: string; passwordPlain: string; role: string }) => void
  error?: string
}

function generatePassword(length = 12): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%^&*'
  const all = lower + upper + digits + symbols
  let pw = ''
  pw += lower[Math.floor(Math.random() * lower.length)]
  pw += upper[Math.floor(Math.random() * upper.length)]
  pw += digits[Math.floor(Math.random() * digits.length)]
  pw += symbols[Math.floor(Math.random() * symbols.length)]
  for (let i = pw.length; i < length; i++) {
    pw += all[Math.floor(Math.random() * all.length)]
  }
  return pw
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    passwordPlain: generatePassword(),
    role: 'CUSTOMER_SUPPORT',
  })

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNewAdmin({
        email: '',
        passwordPlain: generatePassword(),
        role: 'CUSTOMER_SUPPORT',
      })
      setShowPassword(false)
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(newAdmin)
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
        Create Account
      </button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<UserPlus size={20} />}
      title="Add Administrative User"
      description="They'll receive login credentials via email."
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
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              required
              type="email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="admin@example.com"
              style={{
                width: '100%',
                padding: '11px 12px 11px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Temporary Password
            </label>
            <button
              type="button"
              onClick={() => setNewAdmin((p) => ({ ...p, passwordPlain: generatePassword() }))}
              title="Generate new password"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                padding: 0,
              }}
            >
              <RefreshCw size={13} /> Regenerate
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={newAdmin.passwordPlain}
              onChange={(e) => setNewAdmin({ ...newAdmin, passwordPlain: e.target.value })}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '11px 42px 11px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '14px',
                fontFamily: showPassword ? 'inherit' : 'monospace',
                letterSpacing: showPassword ? 'normal' : '0.15em',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Auto-generated. Admin must change this on first login.
          </p>
        </div>

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
            Initial Role
          </label>
          <select
            className="input"
            value={newAdmin.role}
            onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
            style={{ paddingTop: '12px', paddingBottom: '12px', backgroundColor: 'var(--surface)' }}
          >
            <option value="CUSTOMER_SUPPORT">Customer Support</option>
            <option value="SUPERADMIN">Super Administrator</option>
          </select>
        </div>
      </form>
    </Modal>
  )
}
