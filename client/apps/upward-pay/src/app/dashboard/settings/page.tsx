/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme } from '@/features/dashboard/components/ThemeProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { success, error } = useToast()

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  if (!user) return null


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      error('New passwords do not match')
      return
    }
    setSaving(true)
    try {
      // In a real app, you'd have a specific endpoint for this
      await api.post('/user/auth/change-password', passwords)
      success('Password updated successfully')
      setIsChangingPassword(false)
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      error(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page dashboard--nav-offset">
      <PageHeader title="Settings" showBack backPath="/dashboard/me" showSettings={false} />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          {/* Theme Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">Appearance</h3>
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === 'light' ? 'is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className="theme-option__icon">
                  <Sun size={20} />
                </div>
                <span>Light</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className="theme-option__icon">
                  <Moon size={20} />
                </div>
                <span>Dark</span>
              </button>
              <button
                className={`theme-option ${theme === 'system' ? 'is-active' : ''}`}
                onClick={() => setTheme('system')}
              >
                <div className="theme-option__icon">
                  <Monitor size={20} />
                </div>
                <span>System</span>
              </button>
            </div>
          </section>



          {/* Security Section */}
          <section className="settings-section">
            <h3 className="settings-section__title">Security</h3>
            <div className="settings-list">


              <div
                className="settings-item"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                <div className="settings-item__left">
                  <div className="settings-item__icon-wrap">
                    <Lock size={18} color="var(--clay)" />
                  </div>
                  <div>
                    <span className="settings-item__title">Change Password</span>
                    <p className="settings-item__sub">Update your account password</p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  color="var(--text-muted)"
                  className={`settings-chevron ${isChangingPassword ? 'is-open' : ''}`}
                />
              </div>

              {isChangingPassword && (
                <form className="password-form animate-fade-in" onSubmit={handlePasswordChange}>
                  <div className="auth-form__field">
                    <label>Current Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="input-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="auth-form__field">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required
                    />
                  </div>
                  <div className="auth-form__field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required
                    />
                  </div>
                  <button className="btn btn--primary btn--full" type="submit" disabled={saving}>
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Account Section */}
          <section className="settings-section">
            <div className="settings-list">
              <div className="settings-item settings-item--logout" onClick={logout}>
                <div className="settings-item__left">
                  <div className="settings-item__icon-wrap settings-item__icon-wrap--logout">
                    <LogOut size={18} color="#ef4444" />
                  </div>
                  <span className="settings-item__title">Sign Out</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding-bottom: 80px;
        }
        .settings-section {
          margin-bottom: 32px;
          padding: 0 1rem;
        }
        .settings-section__title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 12px;
          padding-left: 4px;
        }
        .theme-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: var(--surface);
          padding: 8px;
          border-radius: 16px;
          border: 1px solid var(--border);
        }
        .theme-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 8px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .theme-option.is-active {
          background: var(--bg);
          color: var(--clay);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .theme-option__icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface2);
          border-radius: 10px;
          transition: all 0.2s;
        }
        .theme-option.is-active .theme-option__icon {
          background: var(--clay-faint);
          color: var(--clay);
        }
        .theme-option span {
          font-size: 12px;
          font-weight: 600;
        }

        .settings-list {
          background: var(--surface);
          border-radius: 20px;
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border);
        }
        .settings-item:last-child {
          border-bottom: none;
        }
        .settings-item:active {
          background: var(--surface2);
        }
        .settings-item__left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .settings-item__icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface2);
        }
        .settings-item__title {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }
        .settings-item__sub {
          font-size: 12px;
          color: var(--text-muted);
        }



        .settings-chevron {
          transition: transform 0.3s;
        }
        .settings-chevron.is-open {
          transform: rotate(90deg);
        }

        .password-form {
          padding: 20px;
          background: var(--bg);
          border-top: 1px solid var(--border);
        }

        .settings-item--logout {
          transition: all 0.2s;
        }
        .settings-item--logout .settings-item__title {
          color: var(--text);
          transition: color 0.2s;
        }
        .settings-item__icon-wrap--logout {
          background: var(--surface2);
          transition: all 0.2s;
        }
        .settings-item__icon-wrap--logout :global(svg) {
          color: var(--text-muted) !important;
          transition: all 0.2s;
        }

        .settings-item--logout:hover {
          background: rgba(239, 68, 68, 0.04);
        }
        .settings-item--logout:hover .settings-item__title {
          color: var(--danger, #ef4444);
        }
        .settings-item--logout:hover .settings-item__icon-wrap--logout {
          background: rgba(239, 68, 68, 0.1);
        }
        .settings-item--logout:hover .settings-item__icon-wrap--logout :global(svg) {
          color: var(--danger, #ef4444) !important;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Large Screen Desktop View Logic */
        @media (min-width: 1024px) {
          .settings-page {
            max-width: 860px;
            margin: 0 auto;
            padding-top: 2rem;
          }
          
          .dashboard__main-grid {
            grid-template-columns: 1fr;
          }

          .dashboard__col--left {
            margin: 0 auto;
            width: 100%;
          }

          .settings-section {
            padding: 0;
            margin-bottom: 40px;
          }

          .theme-selector {
            box-shadow: var(--shadow-sm);
            padding: 12px;
            border-radius: 20px;
          }

          .theme-option {
            padding: 16px;
          }

          .settings-list {
            box-shadow: var(--shadow-sm);
          }
          
          .settings-item {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}
