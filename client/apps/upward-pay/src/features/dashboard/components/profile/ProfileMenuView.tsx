'use client'

import React, { useRef, useMemo } from 'react'
import { Camera, ChevronRight, LogOut, User, Building, Shield, MessageCircle, AlertCircle, Settings, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import { type UserProfile, type ContractData } from '../../types'

interface ProfileMenuViewProps {
  profile: UserProfile
  contracts: ContractData[]
  refreshUser: () => Promise<void>
  logout: () => void
  onNavigate: (view: 'personal' | 'banking') => void
}

export function ProfileMenuView({ profile, contracts, refreshUser, logout, onNavigate }: ProfileMenuViewProps) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isProfileComplete = useMemo(() => {
    if (!profile) return false
    
    const hasCore = !!(
      profile.firstName && 
      profile.lastName && 
      profile.email && 
      profile.gender && 
      profile.gender !== 'Prefer not to say'
    )
    if (!hasCore) return false

    const hasProperties = profile.properties && profile.properties.length > 0
    if (!hasProperties) return false

    const firstProp = profile.properties![0]
    const hasManagement = !!(firstProp.companyName || firstProp.managerName)
    const hasLocation = !!(
      (firstProp.location?.area || firstProp.location?.address) &&
      firstProp.location?.state &&
      firstProp.location?.country
    )
    const hasDates = !!firstProp.rentEndDate
    const hasAmount = !!firstProp.rentAmount

    return hasManagement && hasLocation && hasDates && hasAmount
  }, [profile])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { uploadUrl, publicUrl } = await api.getAvatarUploadUrl(file.type, file.name)
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!response.ok) throw new Error('Upload failed')
      await api.updateProfile({ profilePic: publicUrl })
      await refreshUser()
      success('Profile picture updated')
    } catch (err) {
      console.error('Upload error:', err)
      toastError('Failed to update picture')
    }
  }

  const accountGroup = [
    { id: 'personal', title: 'Personal Details', icon: User, onClick: () => onNavigate('personal') },
    { id: 'banking', title: 'Banking & Payouts', icon: Building, onClick: () => onNavigate('banking') },
    { id: 'contracts', title: 'My Documents', icon: FileText, onClick: () => router.push('/dashboard/documents') },
  ]

  const supportGroup = [
    { id: 'support', title: 'Customer Service Center', icon: MessageCircle, onClick: () => router.push('/dashboard/help') },
    { id: 'legal', title: 'Legal & Privacy', icon: Shield, onClick: () => router.push('/dashboard/legal') },
  ]

  return (
    <div className="profile-shell">
      {/* Header Section */}
      <header className="profile-header animate-slide-up">
        <div className="profile-header__title-wrap">
          <h1 className="profile-header__title">Profile</h1>
          <p className="profile-header__subtitle">Manage your account and settings</p>
        </div>
        <button 
          className="profile-header__settings-btn"
          onClick={() => router.push('/dashboard/settings')}
          title="Settings"
          type="button"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* User Hero Card */}
      <div className="profile-hero-card animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="profile-hero-card__avatar-section">
          <div className="profile-hero-card__avatar-wrap" onClick={() => fileInputRef.current?.click()}>
            <UserAvatar
              src={profile.profilePic}
              size={72}
              className="profile-hero-card__avatar"
              color="var(--bg)"
            />
            <div className="profile-hero-card__avatar-edit">
              <Camera size={12} />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
          </div>
        </div>

        <div className="profile-hero-card__info-section">
          <h2 className="profile-hero-card__name">
            Hello, {profile.firstName || 'User'}
          </h2>
          <p className="profile-hero-card__subtext">Welcome back!</p>
          
          {isProfileComplete ? (
            <div className="profile-hero-card__status profile-hero-card__status--verified">
              <Shield size={12} />
              <span>Verified</span>
            </div>
          ) : (
            <div className="profile-hero-card__status profile-hero-card__status--incomplete" onClick={() => onNavigate('personal')}>
              <AlertCircle size={12} />
              <span>Incomplete Profile</span>
            </div>
          )}
        </div>
      </div>

      <div className="premium-menu-container animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="premium-menu-group-title">Account</h3>
        <div className="premium-menu-group">
          {accountGroup.map((s, idx) => {
            const Icon = s.icon
            const showWarning = s.id === 'personal' && !isProfileComplete

            let itemClass = ""
            if (s.id === 'personal') itemClass = "premium-menu-item__icon-wrap--purple"
            else if (s.id === 'banking') itemClass = "premium-menu-item__icon-wrap--teal"
            else if (s.id === 'contracts') itemClass = "premium-menu-item__icon-wrap--blue"

            let desc = ""
            if (s.id === 'personal') desc = "Update your personal information"
            else if (s.id === 'banking') desc = "Manage your bank accounts"
            else if (s.id === 'contracts') desc = "View and manage your documents"

            return (
              <div key={idx} className="premium-menu-item" onClick={s.onClick}>
                <div className="flex items-center gap-4">
                  <div className={`premium-menu-item__icon-wrap ${itemClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="premium-menu-item__text-wrap">
                    <span className="premium-menu-item__title">{s.title}</span>
                    {desc && <span className="premium-menu-item__desc">{desc}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showWarning && (
                    <div className="premium-menu-item__warning-dot" title="Profile Incomplete" />
                  )}
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            )
          })}
        </div>

        <h3 className="premium-menu-group-title">Support & Info</h3>
        <div className="premium-menu-group">
          {supportGroup.map((s, idx) => {
            const Icon = s.icon

            let itemClass = ""
            if (s.id === 'support') itemClass = "premium-menu-item__icon-wrap--red"
            else if (s.id === 'legal') itemClass = "premium-menu-item__icon-wrap--blue-alt"

            let desc = ""
            if (s.id === 'support') desc = "Get help and support"
            else if (s.id === 'legal') desc = "Policies, terms and privacy"

            return (
              <div key={idx} className="premium-menu-item" onClick={s.onClick}>
                <div className="flex items-center gap-4">
                  <div className={`premium-menu-item__icon-wrap ${itemClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="premium-menu-item__text-wrap">
                    <span className="premium-menu-item__title">{s.title}</span>
                    {desc && <span className="premium-menu-item__desc">{desc}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="logout-container">
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} className="mr-2" /> Sign Out
          </button>
        </div>
      </div>

      <style jsx>{`
        .profile-shell {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem 1rem 3rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        @media (min-width: 768px) {
          .profile-shell {
            padding: 1.5rem 1.5rem 4rem;
            gap: 1.5rem;
          }
        }

        /* Profile Header */
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0.25rem 0.5rem;
        }

        .profile-header__title-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .profile-header__title {
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .profile-header__subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0;
        }

        .profile-header__settings-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--bg);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }

        .profile-header__settings-btn:hover {
          background: var(--surface);
          color: var(--text);
          transform: scale(1.03);
        }

        /* Profile Hero Card */
        .profile-hero-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          margin-bottom: 0.25rem;
        }

        .profile-hero-card__avatar-section {
          flex-shrink: 0;
        }

        .profile-hero-card__avatar-wrap {
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .profile-hero-card__avatar-wrap:hover {
          transform: scale(1.03);
        }

        .profile-hero-card__avatar-edit {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: var(--clay);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid var(--bg);
          box-shadow: var(--shadow-sm);
        }

        .profile-hero-card__info-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: flex-start;
        }

        .profile-hero-card__name {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.015em;
          margin: 0;
        }

        .profile-hero-card__subtext {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 6px;
        }

        .profile-hero-card__status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .profile-hero-card__status--verified {
          background: var(--success-bg);
          color: var(--success);
        }

        .profile-hero-card__status--incomplete {
          background: rgba(245, 158, 11, 0.08);
          color: var(--warning);
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .profile-hero-card__status--incomplete:hover {
          opacity: 0.9;
        }

        /* Menu Groups */
        .premium-menu-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .premium-menu-group-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }

        .premium-menu-group {
          background: var(--bg);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }

        .premium-menu-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.125rem 1.25rem;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid var(--border);
        }

        .premium-menu-item:last-child {
          border-bottom: none;
        }

        .premium-menu-item:hover {
          background: var(--surface);
        }

        .premium-menu-item__icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .premium-menu-item:hover .premium-menu-item__icon-wrap {
          transform: scale(1.05);
        }

        /* Icon Colors */
        .premium-menu-item__icon-wrap--purple {
          background: rgba(112, 72, 232, 0.08);
          color: #7048e8;
        }
        .premium-menu-item__icon-wrap--teal {
          background: rgba(12, 166, 120, 0.08);
          color: #0ca678;
        }
        .premium-menu-item__icon-wrap--blue {
          background: rgba(28, 126, 214, 0.08);
          color: #1c7ed6;
        }
        .premium-menu-item__icon-wrap--red {
          background: rgba(240, 62, 62, 0.08);
          color: #f03e3e;
        }
        .premium-menu-item__icon-wrap--blue-alt {
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
        }

        .premium-menu-item__text-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }

        .premium-menu-item__title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text);
        }

        .premium-menu-item__desc {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .premium-menu-item__warning-dot {
          width: 8px;
          height: 8px;
          background: var(--warning);
          border-radius: 50%;
        }

        .logout-container {
          margin-top: 1.25rem;
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.9rem;
          border-radius: 16px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: var(--bg);
          color: var(--error);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.04);
          border-color: var(--error);
        }

        .hidden { display: none; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .mr-2 { margin-right: 0.5rem; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  )
}
