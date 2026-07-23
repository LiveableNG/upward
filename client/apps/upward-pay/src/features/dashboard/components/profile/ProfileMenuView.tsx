'use client'

import React, { useRef, useMemo } from 'react'
import {
  Camera,
  ChevronRight,
  LogOut,
  User,
  Building,
  Building2,
  ClipboardList,
  // Search, // Hidden with Request a home menu item
  Shield,
  MessageCircle,
  FileText,
  Home,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import { Capacitor } from '@capacitor/core'
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { type UserProfile, type ContractData } from '../../types'
import { isOnboardingComplete } from '../../utils/profileCompletion'

interface ProfileMenuViewProps {
  profile: UserProfile
  contracts: ContractData[]
  refreshUser: () => Promise<void>
  logout: () => void
  onNavigate: (view: 'personal' | 'banking') => void
}

function formatProfileLocation(profile: UserProfile): string | null {
  const prop = profile.properties?.[0]
  if (prop?.location) {
    const parts = [prop.location.area, prop.location.state].filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
  }
  if (profile.address?.trim()) return profile.address.trim()
  return null
}

export function ProfileMenuView({
  profile,
  contracts: _contracts,
  refreshUser,
  logout,
  onNavigate,
}: ProfileMenuViewProps) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onboardingComplete = useMemo(() => isOnboardingComplete(profile), [profile])
  const locationLabel = useMemo(() => formatProfileLocation(profile), [profile])
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User'

  const isPersonalProfileRich = useMemo(() => {
    if (!profile) return false
    return !!(
      profile.firstName &&
      profile.lastName &&
      profile.email &&
      profile.gender &&
      profile.gender !== 'Prefer not to say'
    )
  }, [profile])

  const uploadFile = async (file: File) => {
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

  const handleAvatarClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
        })

        if (!image.base64String) return

        const response = await fetch(`data:image/${image.format};base64,${image.base64String}`)
        const blob = await response.blob()
        const file = new File([blob], `avatar.${image.format}`, { type: `image/${image.format}` })

        await uploadFile(file)
      } catch (err) {
        console.error('Camera error:', err)
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
  }

  const accountGroup = [
    {
      id: 'personal',
      title: 'Personal Details',
      desc: 'Update your information',
      icon: User,
      onClick: () => onNavigate('personal'),
    },
    {
      id: 'rental',
      title: 'Rental Details',
      desc: 'Manage your rental and tenancy',
      icon: Home,
      onClick: () => router.push('/dashboard/setup/rental?mode=edit'),
    },
    {
      id: 'banking',
      title: 'Banking & Payouts',
      desc: 'Manage your bank accounts',
      icon: Building,
      onClick: () => onNavigate('banking'),
    },
    {
      id: 'contracts',
      title: 'My Documents',
      desc: 'View and manage your documents',
      icon: FileText,
      onClick: () => router.push('/dashboard/documents'),
    },
  ]

  const discoverGroup = [
    // Hidden for now — leave Find a home / request flow intact
    // {
    //   id: 'request-home',
    //   title: 'Request a home',
    //   desc: 'Tell us what you need — verified agents, scam-protected',
    //   icon: Search,
    //   onClick: () => router.push('/dashboard/exclusive-homes/request'),
    // },
    {
      id: 'exclusive-homes',
      title: 'Browse Exclusive Homes',
      desc: 'Verified rentals only on Upward · 0% agent fees',
      icon: Building2,
      onClick: () => router.push('/dashboard/exclusive-homes'),
    },
    {
      id: 'home-applications',
      title: 'My requests & applications',
      desc: 'Track matches, prep, and viewing status',
      icon: ClipboardList,
      onClick: () => router.push('/dashboard/exclusive-homes/applications'),
    },
  ]

  const supportGroup = [
    {
      id: 'support',
      title: 'Customer Service Center',
      desc: 'Get help and support',
      icon: MessageCircle,
      onClick: () => router.push('/dashboard/help'),
    },
    {
      id: 'legal',
      title: 'Legal & Privacy',
      desc: 'Policies, terms and privacy',
      icon: Shield,
      onClick: () => router.push('/dashboard/legal'),
    },
  ]

  return (
    <>
      <div className="profile-page__hero">
        <div
          className="profile-page__avatar-wrap"
          onClick={handleAvatarClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleAvatarClick()
          }}
          role="button"
          tabIndex={0}
          aria-label="Change profile picture"
        >
          <UserAvatar
            src={profile.profilePic}
            alt={displayName}
            size={56}
            className="profile-page__avatar"
            color="#c2501f"
          />
          <div className="profile-page__avatar-edit">
            <Camera size={11} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="profile-page__file-input"
            accept="image/*"
          />
        </div>

        <div className="profile-page__hero-info">
          <h2 className="profile-page__hero-name">{displayName}</h2>
          {locationLabel ? (
            <p className="profile-page__hero-location">{locationLabel}</p>
          ) : null}

          {onboardingComplete ? (
            <span className="profile-page__hero-badge profile-page__hero-badge--verified">
              Verified Tenant
            </span>
          ) : (
            <button
              type="button"
              className="profile-page__hero-badge profile-page__hero-badge--incomplete"
              onClick={() => router.push('/dashboard/setup')}
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>

      <div className="profile-page__section">
        <h3 className="profile-page__section-label">Account</h3>
        <div className="profile-page__menu-card">
          {accountGroup.map((item) => {
            const Icon = item.icon
            const showWarning =
              (item.id === 'personal' && !isPersonalProfileRich) ||
              (item.id === 'rental' && !onboardingComplete)

            return (
              <button
                key={item.id}
                type="button"
                className="profile-page__menu-item"
                onClick={item.onClick}
              >
                <span className="profile-page__menu-icon">
                  <Icon size={16} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">{item.title}</span>
                  <span className="profile-page__menu-desc">{item.desc}</span>
                </span>
                <span className="profile-page__menu-trail">
                  {showWarning ? (
                    <span className="profile-page__menu-warning" title="Incomplete" />
                  ) : null}
                  <ChevronRight size={16} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="profile-page__section">
        <h3 className="profile-page__section-label">Discover</h3>
        <div className="profile-page__menu-card">
          {discoverGroup.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className="profile-page__menu-item"
                onClick={item.onClick}
              >
                <span className="profile-page__menu-icon">
                  <Icon size={16} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">{item.title}</span>
                  <span className="profile-page__menu-desc">{item.desc}</span>
                </span>
                <span className="profile-page__menu-trail">
                  <ChevronRight size={16} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="profile-page__section">
        <h3 className="profile-page__section-label">Support &amp; Info</h3>
        <div className="profile-page__menu-card">
          {supportGroup.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className="profile-page__menu-item"
                onClick={item.onClick}
              >
                <span className="profile-page__menu-icon profile-page__menu-icon--muted">
                  <Icon size={16} />
                </span>
                <span className="profile-page__menu-text">
                  <span className="profile-page__menu-title">{item.title}</span>
                  <span className="profile-page__menu-desc">{item.desc}</span>
                </span>
                <span className="profile-page__menu-trail">
                  <ChevronRight size={16} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button type="button" className="profile-page__sign-out" onClick={logout}>
        <LogOut size={18} />
        Sign Out
      </button>
    </>
  )
}
