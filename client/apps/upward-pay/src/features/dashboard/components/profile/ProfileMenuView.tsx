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
    const baseUrl = Capacitor.isNativePlatform() ? 'https://upward.goodtenants.io' : window.location.origin
    const url = `${baseUrl}/profile/${profile?.uuid}`
    
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied to clipboard')
    } catch (err) {
      toastError('Failed to copy link')
    }
  }

  const sections = [
    { id: 'personal', title: 'Personal Details', icon: User, onClick: () => onNavigate('personal') },
    { id: 'banking', title: 'Banking & Payouts', icon: Building, onClick: () => onNavigate('banking') },
    { id: 'contracts', title: 'Tenancy Agreement', icon: FileText, onClick: () => router.push('/dashboard/contracts') },
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

        {contracts.length > 0 && (
          <div className="premium-hero__tenancy">
            <div className="flex gap-4 items-center mb-4">
              <div className="premium-hero__tenancy-icon">
                <FileText size={18} />
              </div>
              <div className="text-left">
                <h4 className="premium-hero__tenancy-title">Active Tenancy</h4>
                <p className="premium-hero__tenancy-property">{contracts[0].fileName}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-solid border-opacity-10 border-[var(--text)]">
              <span className="text-xs text-muted">
                Uploaded {formatDate(contracts[0].createdAt)}
              </span>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => router.push('/dashboard/contracts')}
              >
                Manage
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="premium-menu-list animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {sections.map((s, idx) => {
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

        <div className="premium-menu-item premium-menu-item--logout" onClick={logout}>
          <div className="flex items-center gap-4">
            <div className="premium-menu-item__icon-wrap premium-menu-item__icon-wrap--logout">
              <LogOut size={18} />
            </div>
            <span className="premium-menu-item__title text-red-500">Sign Out</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-shell {
          max-width: 800px;
          margin: 0 auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .premium-hero {
          background: var(--surface);
          border-radius: 28px;
          padding: 3rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid var(--border-solid);
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
        }

        .premium-hero__avatar-wrap {
          position: relative;
          margin-bottom: 1.5rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .premium-hero__avatar-wrap:hover {
          transform: scale(1.02);
        }

        .premium-hero__avatar-edit {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: var(--clay);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--surface);
          box-shadow: 0 4px 12px rgba(var(--clay-rgb), 0.3);
        }

        .premium-hero__name {
          font-size: 1.6rem;
          font-weight: 800;
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
          color: var(--text);
        }

        .premium-hero__email {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin: 0 0 2rem;
        }

        .premium-hero__share-btn {
          margin-bottom: 2rem;
          padding: 14px 24px;
          font-size: 0.95rem;
        }

        .premium-hero__tenancy {
          width: 100%;
          max-width: 420px;
          background: var(--surface2);
          padding: 1.5rem;
          border-radius: 20px;
          border: 1px solid var(--border-solid);
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

        /* Menu List */
        .premium-menu-list {
          background: var(--surface);
          border-radius: 28px;
          padding: 1rem;
          border: 1px solid var(--border-solid);
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .premium-menu-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-menu-item:hover {
          background: var(--bg);
          transform: translateX(4px);
        }

        .premium-menu-item__icon-wrap {
          width: 42px;
          height: 42px;
          background: var(--bg);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .premium-menu-item:hover .premium-menu-item__icon-wrap {
          background: var(--clay-faint);
          color: var(--clay);
        }

        .premium-menu-item__title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text);
        }

        .premium-menu-item--logout {
          margin-top: 0.5rem;
          border-top: 1px solid var(--border-solid);
          border-top-left-radius: 0;
          border-top-right-radius: 0;
          padding-top: 1.5rem;
        }

        .premium-menu-item--logout:hover {
          background: rgba(239, 68, 68, 0.05);
        }

        .premium-menu-item__icon-wrap--logout {
          color: var(--error);
        }

        .premium-menu-item--logout:hover .premium-menu-item__icon-wrap--logout {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
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
