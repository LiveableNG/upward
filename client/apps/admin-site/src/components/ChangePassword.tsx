import React, { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'
import { apiService } from '../services/api.service'

interface User {
  id: string
  email: string
  role: string
  mustChangePassword: boolean
}

interface ChangePasswordProps {
  token: string
  onSuccess: (updatedUser: User) => void
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ token, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await apiService.post('/admin/change-password', { newPasswordPlain: newPassword }, token)

      // Update local storage user data
      const userStr = localStorage.getItem('admin_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        user.mustChangePassword = false
        localStorage.setItem('admin_user', JSON.stringify(user))
        onSuccess(user)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setError(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
      }}
    >
      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid var(--accent-muted)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'var(--accent-faint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            margin: '0 auto 24px',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Security Check</h2>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '15px',
            marginBottom: '32px',
            lineHeight: '1.6',
          }}
        >
          Your account was recently created. For security reasons, you must change your password
          before continuing to the platform.
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '48px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '15px',
                  outline: 'none',
                  backgroundColor: 'var(--surface)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Confirm Password
            </label>
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontSize: '15px',
                outline: 'none',
                backgroundColor: 'var(--surface)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '12px',
              padding: '14px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'var(--transition)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              'Updating...'
            ) : (
              <>
                Update Password
                <CheckCircle2 size={18} />
              </>
            )}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Tip: Use at least 8 characters with numbers and symbols for a stronger password.
        </p>
      </div>
    </div>
  )
}

export default ChangePassword
