'use client'

import React, { useRef, useMemo } from 'react'
import { Camera, Share2, FileText, ChevronRight, LogOut, User, Building, Shield, MessageCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
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

  const handleCopyLink = async () => {
    const defaultWebUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
    const baseUrl = Capacitor.isNativePlatform() ? defaultWebUrl : window.location.origin
    const url = `${baseUrl}/profile/${profile?.uuid}`
    
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied to clipboard')
    } catch (err) {
      toastError('Failed to copy link')
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
      <div className="premium-hero animate-slide-up">
        <div className="premium-hero__avatar-wrap" onClick={() => fileInputRef.current?.click()}>
          <UserAvatar
            src={profile.profilePic}
            size={96}
            className="premium-hero__avatar"
            color="var(--bg)"
          />
          <div className="premium-hero__avatar-edit">
            <Camera size={16} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        <h2 className="premium-hero__name">
          {profile.firstName} {profile.lastName}
        </h2>
        <p className="premium-hero__email">{profile.email}</p>

        <button 
          className="btn btn--primary btn--pill shadow-md premium-hero__share-btn"
          onClick={() => router.push('/dashboard/kyc')}
        >
          <Share2 size={16} className="mr-2" /> Share Credibility Profile
        </button>

        {/* Active Tenancy Card Removed */}
      </div>

      <div className="premium-menu-container animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="premium-menu-group-title">Account</h3>
        <div className="premium-menu-group">
          {accountGroup.map((s, idx) => {
            const Icon = s.icon
            const showWarning = s.id === 'personal' && !isProfileComplete

            return (
              <div key={idx} className="premium-menu-item" onClick={s.onClick}>
                <div className="flex items-center gap-4">
                  <div className="premium-menu-item__icon-wrap">
                    <Icon size={18} />
                  </div>
                  <span className="premium-menu-item__title">{s.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {showWarning && (
                    <div className="premium-menu-item__warning" title="Profile Incomplete">
                      <AlertCircle size={16} color="var(--warning)" />
                    </div>
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

            return (
              <div key={idx} className="premium-menu-item" onClick={s.onClick}>
                <div className="flex items-center gap-4">
                  <div className="premium-menu-item__icon-wrap">
                    <Icon size={18} />
                  </div>
                  <span className="premium-menu-item__title">{s.title}</span>
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
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .profile-shell {
            padding: 1.5rem;
          }
        }

        .premium-hero {
          padding: 2.5rem 1rem 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          border: none;
          box-shadow: none;
        }

        .premium-hero__avatar-wrap {
          position: relative;
          margin-bottom: 1.25rem;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .premium-hero__avatar-wrap:hover {
          transform: scale(1.02);
        }

        .premium-hero__avatar-edit {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: var(--clay);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--bg);
          box-shadow: var(--shadow-md);
        }

        .premium-hero__name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
          color: var(--text);
        }

        .premium-hero__email {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0 0 1.25rem;
        }

        .premium-hero__share-btn {
          margin-bottom: 1.5rem;
          padding: 10px 18px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .premium-hero__tenancy {
          width: 100%;
          max-width: 100%;
          background: var(--surface);
          padding: 1.25rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          margin-top: 1rem;
        }

        .premium-hero__tenancy-icon {
          width: 44px;
          height: 44px;
          background: var(--clay-faint);
          color: var(--clay);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .premium-hero__tenancy-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 2px;
        }

        .premium-hero__tenancy-property {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
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
          width: 36px;
          height: 36px;
          background: var(--surface);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .premium-menu-item:hover .premium-menu-item__icon-wrap {
          background: var(--clay-faint);
          color: var(--clay);
        }

        .premium-menu-item__title {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text);
        }

        .logout-container {
          margin-top: 1rem;
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.875rem 1.5rem;
          border-radius: 14px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: transparent;
          color: var(--error);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.05);
          border-color: var(--error);
        }

        .hidden { display: none; }
        .text-muted { color: var(--text-muted); }

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
