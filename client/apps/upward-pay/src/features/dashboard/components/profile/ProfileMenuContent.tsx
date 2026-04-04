/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Settings,
  Palette,
  LogOut,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Heart,
  MapPin,
  ShieldAlert,
  AlertCircle,
  ChevronRight,
  Check,
  Edit2,
  Trophy,
  Star,
  Crown,
  Shield,
  Users,
  Vote,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { DetailOrEdit } from './DetailOrEdit'
import { type TenantProfile, type ContractData } from '../../types'

type ViewMode = 'menu' | 'personal'

export function ProfileMenuContent() {
  const router = useRouter()
  const { logout, user } = useAuth()
  const [view, setView] = useState<ViewMode>('menu')
  const [isEditing, setIsEditing] = useState(false)
  const [tenant, setTenant] = useState<TenantProfile | null>(null)
  const [formData, setFormData] = useState<Partial<TenantProfile>>({})
  const [saving, setSaving] = useState(false)
  const [contracts, setContracts] = useState<ContractData[]>([])

  useEffect(() => {
    if (user) {
      setTenant(user as any)
      setFormData(user as any)
      loadDocuments()
    }
  }, [user])

  async function loadDocuments() {
    try {
      const data = await api.getMyDocuments()
      setContracts(data.contracts)
    } catch (err) {
      console.error('Failed to load documents', err)
    }
  }

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await api.updateProfile(formData)
      if (res.success) {
        setTenant(res.tenant)
        setIsEditing(false)
        // Note: In a real app, you'd also update the global auth context here
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'personal', title: 'Personal Details', icon: User, label: 'Profile' },
    { id: 'contracts', title: 'Tenancy Agreement', icon: FileText, label: 'Lease' },
    { id: 'personalization', title: 'Personalization', icon: Palette, label: 'Themes' },
    { id: 'settings', title: 'Settings', icon: Settings, label: 'Preferences' },
  ]

  if (!tenant) return null

  const hasMissingFields =
    !tenant.dateOfBirth ||
    !tenant.gender ||
    !tenant.occupation ||
    !tenant.address ||
    !tenant.emergencyContactName ||
    !tenant.rentAnniversary

  if (view === 'personal') {
    return (
      <div className="profile-page dashboard--nav-offset">
        <header className="dashboard__header dashboard__header--mobile">
          <div className="dashboard__header-left">
            <button
              className="dashboard__back"
              onClick={() => {
                setView('menu')
                setIsEditing(false)
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="dashboard__title">{isEditing ? 'Edit Details' : 'Personal Details'}</h2>
          </div>
          <div className="dashboard__header-right">
            {!isEditing ? (
              <button className="dashboard__icon-btn" onClick={() => setIsEditing(true)}>
                <Edit2 size={18} />
              </button>
            ) : (
              <button className="dashboard__icon-btn" onClick={handleSave} disabled={saving}>
                <Check size={20} color="var(--success)" />
              </button>
            )}
          </div>
        </header>

        <header className="dashboard__header--desktop">
          <div className="dashboard__desktop-header-left">
            <button
              className="btn btn--ghost profile-page__back-btn"
              onClick={() => {
                setView('menu')
                setIsEditing(false)
              }}
            >
              <ArrowLeft size={18} /> Back to Settings
            </button>
            <div className="profile-page__desktop-title-wrap">
              <div>
                <h1 className="dashboard__desktop-title">
                  {isEditing ? 'Edit Profile' : 'Personal Details'}
                </h1>
                <p className="dashboard__desktop-subtitle">
                  Your basic information used across Upward Pay
                </p>
              </div>
              <div className="profile-page__desktop-actions">
                {!isEditing ? (
                  <button className="btn btn--secondary" onClick={() => setIsEditing(true)}>
                    <Edit2 size={16} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn--secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard__main-grid">
          <div className="dashboard__col--left">
            <div className="dashboard__card profile-details-card">
              <div className="profile-details-list">
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={User}
                  label="Full Name"
                  value={formData.fullName || ''}
                  onChange={(v) => setFormData({ ...formData, fullName: v })}
                />
                <DetailOrEdit
                  isEditing={false}
                  icon={Mail}
                  label="Email Address"
                  value={tenant.email}
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
                  icon={Heart}
                  label="Marital Status"
                  value={formData.maritalStatus || ''}
                  onChange={(v) => setFormData({ ...formData, maritalStatus: v })}
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

                <div className="profile-details-section">Emergency Contact</div>

                <DetailOrEdit
                  isEditing={isEditing}
                  icon={ShieldAlert}
                  label="Contact Name"
                  value={formData.emergencyContactName || ''}
                  onChange={(v) => setFormData({ ...formData, emergencyContactName: v })}
                />
                <DetailOrEdit
                  isEditing={isEditing}
                  icon={Phone}
                  label="Contact Phone"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(v) => setFormData({ ...formData, emergencyContactPhone: v })}
                />
              </div>

              {!isEditing && (
                <div className="profile-details-footer">
                  <p>
                    Need to change your primary email or delete your account?{' '}
                    <span className="text--clay" onClick={() => router.push('/dashboard/help')}>
                      Contact Support
                    </span>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-menu-page dashboard--nav-offset">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
          <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="dashboard__title">Housing Credibility Profile</h2>
        </div>
      </header>

      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Account Settings</h1>
          <p className="dashboard__desktop-subtitle">
            Manage your personal information and preferences
          </p>
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          <div className="dashboard__card profile-hero">
            <div className="dashboard__avatar profile-hero__avatar">
              {tenant.fullName.charAt(0)}
            </div>

            <div className="membership-badge">
              <MembershipIcon level={tenant.membershipLevel} />
              <span>{tenant.membershipLevel || 'Window Shopper'}</span>
            </div>

            <h2 className="profile-hero__name">{tenant.fullName}</h2>
            <p className="profile-hero__email">{tenant.email}</p>
            {tenant.totalInvites > 0 && (
              <div className="profile-hero__invites">
                <Users size={12} /> {tenant.totalInvites} People Invited
              </div>
            )}

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
                    Expires {formatDate(contracts[0].leaseEnd)}
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
                    if (isContracts) router.push('/dashboard/contracts')
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
                    {(isPersonal || isContracts) && (
                      <ChevronRight size={16} color="var(--text-muted)" />
                    )}
                  </div>
                </div>
              )
            })}

            <div className="profile-menu-item profile-menu-item--logout" onClick={logout}>
              <div className="profile-menu-item__left">
                <div className="profile-menu-item__icon-wrap profile-menu-item__icon-wrap--logout">
                  <LogOut size={18} color="#ef4444" />
                </div>
                <span className="profile-menu-item__title">Logout</span>
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
    </div>
  )
}

function MembershipIcon({ level }: { level?: string }) {
  if (!level) return <Users size={14} color="var(--text-muted)" />
  if (level.includes('Stakeholder')) return <Shield size={14} color="#a855f7" />
  if (level === 'Voter') return <Vote size={14} color="#3b82f6" />
  if (level.includes('Club Member')) return <Crown size={14} color="#fbbf24" />
  if (level === 'Contributor') return <Star size={14} color="#22c55e" />
  if (level === 'General Member') return <Trophy size={14} color="#d97757" />
  return <Users size={14} color="var(--text-muted)" />
}
