/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  LogOut,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
  AlertCircle,
  ChevronRight,
  Edit2,
  FileText,
  Camera,
  Shield,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { DetailOrEdit } from './DetailOrEdit'
import { type UserProfile, type ContractData } from '../../types'
import { PageHeader } from '@/components/common/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useToast } from '@/components/common/Toast'

type ViewMode = 'menu' | 'personal'

export function ProfileMenuContent() {
  const router = useRouter()
  const { logout, user, refreshUser } = useAuth()
  const { success, error: toastError } = useToast()
  const [view, setView] = useState<ViewMode>('menu')
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [saving, setSaving] = useState(false)
  const [contracts, setContracts] = useState<ContractData[]>([])

  useEffect(() => {
    if (user) {
      setProfile(user as any)
      setFormData(user as any)
      loadDocuments()
    }
  }, [user])

  async function loadDocuments() {
    try {
      const data = await api.getContracts()
      setContracts(data || [])
    } catch (err) {
      console.error('Failed to load documents', err)
    }
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      const res = await api.updateProfile(formData)
      if (res.success) {
        setProfile(res.user)
        setIsEditing(false)
        await refreshUser()
        success('Profile updated successfully')
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async () => {
    const url = prompt('Enter image URL for profile picture (Mock):')
    if (url) {
      setSaving(true)
      try {
        await api.updateProfile({ profilePic: url })
        await refreshUser()
        success('Profile picture updated')
      } catch {
        toastError('Failed to update picture')
      } finally {
        setSaving(false)
      }
    }
  }

  const sections = [
    { id: 'personal', title: 'Personal Details', icon: User },
    { id: 'contracts', title: 'Tenancy Agreement', icon: FileText },
    { id: 'support', title: 'Customer Service Center', icon: MessageCircle },
    { id: 'legal', title: 'Legal & Privacy', icon: Shield },
  ]

  if (!profile) return null

  const hasMissingFields =
    !profile.dateOfBirth ||
    !profile.gender ||
    !profile.occupation ||
    !profile.address ||
    !profile.rentAnniversary

  if (view === 'personal') {
    return (
      <div className="profile-page dashboard--nav-offset">
        <PageHeader
          title={isEditing ? 'Edit Details' : 'Personal Details'}
          showBack
          onBack={() => {
            setView('menu')
            setIsEditing(false)
          }}
        />

        <div className="dashboard__main-grid">
          <div className="dashboard__col--left">
            <div className="dashboard__card profile-details-card">
              <div className="profile-details-list">
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={User}
                  label="First Name"
                  value={formData.firstName || ''}
                  onChange={(v) => setFormData({ ...formData, firstName: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={User}
                  label="Last Name"
                  value={formData.lastName || ''}
                  onChange={(v) => setFormData({ ...formData, lastName: v })}
                />
                <DetailOrEdit
                  isEditing={false}
                  icon={Mail}
                  label="Email Address"
                  value={profile.email}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={Phone}
                  label="Phone Number"
                  value={formData.phone || ''}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={Calendar}
                  label="Date of Birth"
                  value={formData.dateOfBirth || ''}
                  placeholder="YYYY-MM-DD"
                  onChange={(v) => setFormData({ ...formData, dateOfBirth: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={User}
                  label="Gender"
                  value={formData.gender || ''}
                  onChange={(v) => setFormData({ ...formData, gender: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={Briefcase}
                  label="Occupation"
                  value={formData.occupation || ''}
                  onChange={(v) => setFormData({ ...formData, occupation: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={MapPin}
                  label="Residential Address"
                  value={formData.address || ''}
                  onChange={(v) => setFormData({ ...formData, address: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={Calendar}
                  label="Rent Anniversary"
                  value={formData.rentAnniversary || ''}
                  placeholder="DD/MM (e.g. 15th April)"
                  onChange={(v) => setFormData({ ...formData, rentAnniversary: v })}
                />
              </div>

              <div className="profile-details-actions">
                {!isEditing ? (
                  <button
                    className="btn btn--secondary btn--full"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={16} /> Edit Profile
                  </button>
                ) : (
                  <div className="profile-edit-buttons">
                    <button
                      className="btn btn--ghost"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-menu-page dashboard--nav-offset">
      <PageHeader title="Profile" showBack backPath="/dashboard" />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          <div className="dashboard__card profile-hero">
            <div className="profile-hero__avatar-wrap" onClick={handleAvatarChange}>
              <UserAvatar
                src={profile.profilePic}
                size={100}
                className="profile-hero__avatar"
                color="var(--bg)"
              />
              <div className="profile-hero__avatar-edit">
                <Camera size={16} />
              </div>
            </div>

            <h2 className="profile-hero__name">{profile.firstName} {profile.lastName}</h2>
            <p className="profile-hero__email">{profile.email}</p>

            {contracts.length > 0 && (
              <div className="profile-hero__tenancy">
                <div className="profile-hero__tenancy-header">
                  <div className="profile-hero__tenancy-icon">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="profile-hero__tenancy-title">Active Tenancy</h4>
                    <p className="profile-hero__tenancy-property">{contracts[0].propertyName}</p>
                  </div>
                </div>
                <div className="profile-hero__tenancy-footer">
                  <span className="profile-hero__tenancy-expiry">
                    Expires {formatDate(contracts[0].leaseEnd || '')}
                  </span>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => router.push('/dashboard/contracts')}
                  >
                    View & Download
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-menu-list">
            {sections.map((s, idx) => {
              const Icon = s.icon
              const isPersonal = s.id === 'personal'
              const isContracts = s.id === 'contracts'
              const showWarning = isPersonal && hasMissingFields

              return (
                <div
                  key={idx}
                  className="profile-menu-item"
                  onClick={() => {
                    if (isPersonal) setView('personal')
                    else if (isContracts) router.push('/dashboard/contracts')
                    else if (s.id === 'support') router.push('/dashboard/help')
                    else if (s.id === 'legal') router.push('/dashboard/legal')
                  }}
                >
                  <div className="profile-menu-item__left">
                    <div className="profile-menu-item__icon-wrap">
                      <Icon size={18} color="var(--clay)" />
                    </div>
                    <span className="profile-menu-item__title">{s.title}</span>
                  </div>
                  <div className="profile-menu-item__right">
                    {showWarning && (
                      <div className="profile-menu-item__warning">
                        <AlertCircle size={12} color="#eab308" />
                      </div>
                    )}
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              )
            })}

            <div className="profile-menu-item profile-menu-item--logout" onClick={logout}>
              <div className="profile-menu-item__left">
                <div className="profile-menu-item__icon-wrap profile-menu-item__icon-wrap--logout">
                  <LogOut size={18} />
                </div>
                <span className="profile-menu-item__title">Sign Out</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard__col--right dashboard__col--desktop-only">
          <div className="dashboard__card support-card">
            <h3 className="support-card__title">Need Help?</h3>
            <p className="support-card__text">
              Having issues with your account or need to update restricted information?
            </p>
            <button
              className="btn btn--secondary btn--full"
              onClick={() => router.push('/dashboard/help')}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.5rem 1.5rem;
          text-align: center;
          margin-bottom: 24px;
        }
        .profile-hero__avatar-wrap {
          position: relative;
          margin-bottom: 1.5rem;
          cursor: pointer;
        }
        .profile-hero__avatar-edit {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--clay);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--surface);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .profile-hero__name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.25rem;
        }
        .profile-hero__email {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-bottom: 2rem;
        }
        .profile-hero__tenancy {
          width: 100%;
          background: var(--surface2);
          border-radius: 16px;
          padding: 1rem;
          text-align: left;
        }
        .profile-hero__tenancy-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .profile-hero__tenancy-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--clay-faint);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .profile-hero__tenancy-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.1rem;
        }
        .profile-hero__tenancy-property {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
        }
        .profile-hero__tenancy-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .profile-hero__tenancy-expiry {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .profile-menu-list {
          background: var(--surface);
          border-radius: 20px;
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .profile-menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1rem;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border);
        }
        .profile-menu-item:last-child {
          border-bottom: none;
        }
        .profile-menu-item:active {
          background: var(--surface2);
        }
        .profile-menu-item__left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .profile-menu-item__icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .profile-menu-item__title {
          font-size: 1rem;
          font-weight: 600;
        }
        .profile-menu-item__right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .profile-menu-item--logout {
          border-top: 1px solid var(--border);
          color: #ef4444;
        }
        .profile-menu-item__icon-wrap--logout {
          background: #fee2e2 !important;
          color: #ef4444;
        }

        .profile-details-actions {
          padding: 1.5rem;
          border-top: 1px solid var(--border);
        }
        .profile-edit-buttons {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1rem;
        }
      `}</style>
    </div>
  )
}
