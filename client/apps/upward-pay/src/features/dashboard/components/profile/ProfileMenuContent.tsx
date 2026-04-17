/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
  Plus,
  Trash2,
  Building,
  UserCheck,
  Pencil,
  Share2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { DetailOrEdit } from './DetailOrEdit'
import { type UserProfile, type ContractData } from '../../types'
import { PageHeader } from '@/components/common/PageHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useToast } from '@/components/common/Toast'
import { COUNTRIES, STATES } from '@/lib/location-data'

type ViewMode = 'menu' | 'personal'

export function ProfileMenuContent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileMenuContentInner />
    </Suspense>
  )
}

function ProfileMenuContentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout, user, refreshUser } = useAuth()
  const { success, error: toastError } = useToast()
  const [view, setView] = useState<ViewMode>(
    searchParams.get('view') === 'personal' ? 'personal' : 'menu'
  )
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [saving, setSaving] = useState(false)
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [expandedProps, setExpandedProps] = useState<Record<number, boolean>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfile(user)
      setFormData({
        ...user,
        address: user.address || '',
        properties: user.properties?.map((p) => ({
          ...p,
          rentEndDate: p.rentEndDate ? p.rentEndDate.split('T')[0] : '',
          location: {
            ...p.location,
            country: p.location?.country || '',
          },
        })) || [],
      })
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

    if (isEditing && formData.properties) {
      for (const prop of formData.properties) {
        if (!prop.location?.address && !prop.location?.area) {
          toastError('Please provide a street address or area for all properties')
          return
        }
        if (!prop.location?.state) {
          toastError('Please select a state for all properties')
          return
        }
      }
    }

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'personal', title: 'Personal Details', icon: User },
    { id: 'contracts', title: 'Tenancy Agreement', icon: FileText },
    { id: 'support', title: 'Customer Service Center', icon: MessageCircle },
    { id: 'legal', title: 'Legal & Privacy', icon: Shield },
  ]

  const isProfileComplete = useMemo(() => {
    if (!profile) return false
    
    // Core details
    const hasCore = !!(
      profile.firstName && 
      profile.lastName && 
      profile.email && 
      profile.gender && 
      profile.gender !== 'Prefer not to say'
    )
    if (!hasCore) return false

    // Property details
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

  if (!profile) return null

  const handlePropUpdate = (idx: number, field: string, value: any) => {
    const newProps = [...(formData.properties || [])]
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      const prop = newProps[idx] as any
      prop[parent] = { ...prop[parent], [child]: value }
    } else {
      ;(newProps[idx] as any)[field] = value
    }
    setFormData({ ...formData, properties: newProps })
  }

  if (view === 'personal') {
    return (
      <div className="profile-page dashboard--nav-offset">
        <PageHeader
          title={isEditing ? 'Edit Profile' : 'Personal Details'}
          showBack
          backLabel="Back to Profile"
          showSettings={true}
          rightElement={
            isEditing ? (
              <button 
                className="btn btn--primary btn--sm btn--pill" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '...' : 'Save'}
              </button>
            ) : (
              <button 
                className="dashboard__icon-btn" 
                onClick={() => setIsEditing(true)}
                title="Edit Profile"
              >
                <Pencil size={18} />
              </button>
            )
          }
          onBack={isEditing ? () => {
            setIsEditing(false)
            setFormData({ ...(profile as any), properties: (user as any).properties || [] })
          } : () => {
            setView('menu')
            setIsEditing(false)
          }}
        />

        <div className="profile-content-scroll">
          <div className="personal-grid">
            <aside className="personal-grid__sidebar">
              <div className="personal-card">
                <div className="personal-card__header">
                  <h3 className="personal-card__title">Basic Information</h3>
                  <p className="personal-card__subtitle">Your identity and contact details.</p>
                </div>
                <div className="personal-card__body">
                  <DetailOrEdit
                    isEditing={isEditing}
                    icon={User}
                    label="First Name"
                    isCritical={true}
                    value={formData.firstName || ''}
                    onChange={(v) => setFormData({ ...formData, firstName: v })}
                  />
                  <DetailOrEdit
                    isEditing={isEditing}
                    icon={User}
                    label="Last Name"
                    isCritical={true}
                    value={formData.lastName || ''}
                    onChange={(v) => setFormData({ ...formData, lastName: v })}
                  />
                  <DetailOrEdit
                    isEditing={false}
                    icon={Mail}
                    label="Email Address"
                    isCritical={true}
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
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(v) => setFormData({ ...formData, dateOfBirth: v })}
                  />
                  <DetailOrEdit
                    isEditing={isEditing}
                    icon={User}
                    label="Gender"
                    type="select"
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' },
                      { value: 'Prefer not to say', label: 'Prefer not to say' },
                    ]}
                    value={formData.gender || ''}
                    onChange={(v) => setFormData({ ...formData, gender: v })}
                  />

                </div>
              </div>

              {!isEditing && (
                <div className="profile-status-badge-wrap">
                  <div className={`status-badge ${isProfileComplete ? 'status-badge--complete' : 'status-badge--incomplete'}`}>
                    <span className="status-badge__dot" />
                    {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                  </div>
                </div>
              )}
            </aside>

            <main className="personal-grid__main">
              <div className="section-header-row">
                <div>
                  <h2 className="section-title">Property Management</h2>
                  <p className="section-subtitle">Manage your residential assets and tenancy records.</p>
                </div>
                {isEditing && (
                  <button
                    className="btn btn--secondary btn--sm btn--pill"
                    onClick={() => {
                      const newProps = [
                        ...(formData.properties || []),
                        { address: '', rentEndDate: '', isManaged: false, location: { country: '', state: '', area: '' } },
                      ]
                      setFormData({ ...formData, properties: newProps })
                    }}
                  >
                    <Plus size={14} className="mr-1" /> Add Property
                  </button>
                )}
              </div>

              <div className="properties-grid">
                {(formData.properties || []).map((prop: any, idx: number) => (
                  <div key={idx} className={`property-card-v2${expandedProps[idx] ? ' property-card-v2--open' : ''}`}>
                    <div 
                      className="property-card-v2__header"
                      onClick={() => setExpandedProps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="property-card-v2__index">{idx + 1}</div>
                        <div className="property-card-v2__header-info">
                          <h4 className="property-card-v2__name">
                            {prop.location?.address 
                              ? `${prop.location.address}${prop.location.area ? `, ${prop.location.area}` : ''}`
                              : prop.location?.area || 'New Property'}
                          </h4>
                          {!expandedProps[idx] && (
                            <p className="property-card-v2__summary">
                              {[prop.location?.state, prop.location?.country].filter(Boolean).join(', ')}
                              {prop.rentEndDate ? ` · Due ${formatDate(prop.rentEndDate)}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {prop.isManaged && (
                          <div className="managed-badge">
                            <Shield size={10} />
                            <span>Verified Management</span>
                          </div>
                        )}
                        {isEditing && !prop.isManaged && (formData.properties || []).length > 1 && (
                          <button
                            className="property-card-v2__remove"
                            onClick={(e) => {
                              e.stopPropagation()
                              const newProps = [...(formData.properties || [])]
                              newProps.splice(idx, 1)
                              setFormData({ ...formData, properties: newProps })
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        <div className={`property-card-v2__chevron${expandedProps[idx] ? ' property-card-v2__chevron--open' : ''}`}>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>

                    <div className={`property-card-v2__body${expandedProps[idx] ? ' property-card-v2__body--visible' : ''}`}>
                      {isEditing && prop.isManaged && (
                        <div className="managed-notice">
                          <AlertCircle size={14} />
                          <span>This property is managed by {prop.company?.name || prop.companyName}. Contact them to request changes.</span>
                        </div>
                      )}
                      <div className="form-group-row">
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={MapPin}
                          label="Street Address"
                          placeholder="e.g. 12 Adeola Odeku"
                          value={prop.location?.address || ''}
                          onChange={(v) => handlePropUpdate(idx, 'location.address', v)}
                        />
                      </div>

                      <div className="form-group-grid">
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={MapPin}
                          label="Subarea / Estate"
                          placeholder="e.g. Victoria Island"
                          value={prop.location?.subarea || ''}
                          onChange={(v) => handlePropUpdate(idx, 'location.subarea', v)}
                        />
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={MapPin}
                          label="Area / Neighborhood"
                          placeholder="e.g. Lekki"
                          value={prop.location?.area || ''}
                          onChange={(v) => handlePropUpdate(idx, 'location.area', v)}
                        />
                      </div>

                      <div className="form-group-grid">
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={Shield}
                          label="Country"
                          type="select"
                          isCritical={true}
                          options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                          value={prop.location?.country || ''}
                          onChange={(v) => handlePropUpdate(idx, 'location.country', v)}
                        />
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={MapPin}
                          label="State"
                          type="select"
                          isCritical={true}
                          options={
                            STATES[prop.location?.country || 'NG']?.map((s) => ({ value: s, label: s })) || []
                          }
                          value={prop.location?.state || ''}
                          onChange={(v) => handlePropUpdate(idx, 'location.state', v)}
                        />
                      </div>

                      <div className="form-group-grid form-group-row--bordered">
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={Calendar}
                          label="Rent Due Date"
                          type="date"
                          isCritical={true}
                          value={prop.rentEndDate || ''}
                          displayValue={prop.rentEndDate ? formatDate(prop.rentEndDate) : ''}
                          onChange={(v) => handlePropUpdate(idx, 'rentEndDate', v)}
                        />
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={Building}
                          label="Rent Amount"
                          isCritical={true}
                          value={prop.rentAmount?.toString() || ''}
                          displayValue={prop.rentAmount ? formatCurrency(prop.rentAmount, prop.currency || 'NGN') : ''}
                          onChange={(v) => handlePropUpdate(idx, 'rentAmount', parseFloat(v) || 0)}
                        />
                      </div>

                      <div className="form-group-grid">
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={Building}
                          label="Management Company"
                          isCritical={true}
                          value={prop.company?.name || prop.companyName || ''}
                          onChange={(v) => handlePropUpdate(idx, 'companyName', v)}
                        />
                        <DetailOrEdit
                          isEditing={isEditing && !prop.isManaged}
                          icon={UserCheck}
                          label="Property Manager"
                          isCritical={true}
                          value={prop.manager?.firstName || prop.managerName || ''}
                          onChange={(v) => handlePropUpdate(idx, 'managerName', v)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="profile-form-footer">
                  <button
                    className="btn btn--outline btn--full"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({ ...(profile as any), properties: (user as any).properties || [] })
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button className="btn btn--primary btn--full" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>

        <style jsx>{`
          .profile-page {
            --local-border: var(--border-solid);
            --local-surface: var(--surface);
            --local-surface2: var(--surface2);
            --card-radius: 20px;
          }

          .profile-content-scroll {
            max-width: 1100px;
            margin: 0 auto;
            padding: 2rem 1.5rem 8rem;
          }

          @media (min-width: 1024px) {
            .profile-page {
              max-width: 860px;
              margin: 0 auto;
              padding-top: 2rem;
            }
            .personal-grid {
              grid-template-columns: 1fr;
              gap: 2rem;
            }
          }

          .personal-card {
            background: var(--bg);
            border: 1px solid var(--local-border);
            border-radius: var(--card-radius);
            overflow: hidden;
          }

          .personal-card__header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--local-border);
          }

          .personal-card__title {
            font-size: 0.95rem;
            font-weight: 700;
            margin: 0 0 0.2rem;
          }

          .personal-card__subtitle {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin: 0;
          }

          .personal-card__body {
            padding: 1rem 1.25rem;
          }

          .profile-status-badge-wrap {
            margin-top: 1rem;
            display: flex;
            justify-content: center;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 100px;
            font-size: 0.8rem;
            font-weight: 600;
          }

          .status-badge--complete {
            background: rgba(34, 197, 94, 0.1);
            color: #16a34a;
            border: 1px solid rgba(34, 197, 94, 0.2);
          }

          .status-badge--incomplete {
            background: rgba(234, 179, 8, 0.1);
            color: #ca8a04;
            border: 1px solid rgba(234, 179, 8, 0.2);
          }

          .section-header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 1.5rem;
            padding-bottom: 1.25rem;
            border-bottom: 1px solid var(--local-border);
          }

          .section-title {
            font-size: 1.25rem;
            font-weight: 800;
            margin: 0 0 0.3rem;
          }

          .properties-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .property-card-v2 {
            background: var(--bg);
            border: 1px solid var(--local-border);
            border-radius: var(--card-radius);
            overflow: hidden;
            transition: border-color 0.2s ease;
          }

          .property-card-v2:hover {
            border-color: var(--clay);
          }

          .property-card-v2__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem;
            background: var(--local-surface);
            border-bottom: 1px solid var(--local-border);
          }

          .property-card-v2__index {
            width: 28px;
            height: 28px;
            background: var(--clay);
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 800;
          }

          .property-card-v2__name {
            font-size: 0.95rem;
            font-weight: 700;
            margin: 0;
          }

          .managed-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(var(--clay-rgb, 107, 78, 255), 0.1);
            color: var(--clay);
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
          }

          .managed-notice {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--local-surface2);
            padding: 10px 12px;
            border-radius: 10px;
            margin-bottom: 1.25rem;
            font-size: 0.8rem;
            color: var(--text-muted);
            border-left: 3px solid var(--clay);
          }

          /* Accordion body — collapsed by default on mobile */
          .property-card-v2__body {
            display: none;
            padding: 1.25rem;
          }

          .property-card-v2__body--visible {
            display: block;
          }

          /* On desktop, always show body */
          @media (min-width: 768px) {
            .property-card-v2__body {
              display: block !important;
            }
            .property-card-v2__chevron {
              display: none;
            }
          }

          .property-card-v2__header-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .property-card-v2__summary {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin: 0;
          }

          .property-card-v2__chevron {
            display: flex;
            align-items: center;
            color: var(--text-muted);
            transition: transform 0.2s ease;
            flex-shrink: 0;
          }

          .property-card-v2__chevron--open {
            transform: rotate(90deg);
          }

          .form-group-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .form-group-row {
            margin-bottom: 1rem;
          }

          .form-group-row--bordered {
            border-top: 1px solid var(--local-border);
            padding-top: 1rem;
            margin-top: 0.25rem;
          }

          .profile-form-footer {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid var(--local-border);
          }

          @media (max-width: 1024px) {
            .personal-grid {
              grid-template-columns: 1fr;
              gap: 1.5rem;
            }
            .profile-content-scroll {
              padding: 1rem 1rem 10rem;
            }
            .section-header-row {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.75rem;
            }
          }

          @media (max-width: 640px) {
            .form-group-grid {
              grid-template-columns: 1fr !important;
              gap: 0;
            }
            .profile-form-footer {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    )
  }
  return (
    <div className="profile-menu-page dashboard--nav-offset">
      <PageHeader 
        title="Profile" 
        showBack 
        backPath="/dashboard" 
        rightIcon={<Pencil size={18} />}
        onRightClick={() => {
          setView('personal')
          setIsEditing(true)
        }}
      />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          <div className="dashboard__card profile-hero">
            <div className="profile-hero__avatar-wrap" onClick={() => fileInputRef.current?.click()}>
              <UserAvatar
                src={profile.profilePic}
                size={88}
                className="profile-hero__avatar"
                color="var(--bg)"
              />
              <div className="profile-hero__avatar-edit">
                <Camera size={14} />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>

            <h2 className="profile-hero__name">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="profile-hero__email">{profile.email}</p>

            <button 
              className="btn btn--primary btn--sm btn--pill mb-6 shadow-sm"
              onClick={() => router.push('/dashboard/kyc')}
              style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
            >
              <Share2 size={14} className="mr-2" /> Share Credibility Profile
            </button>

            {contracts.length > 0 && (
              <div className="profile-hero__tenancy">
                <div className="profile-hero__tenancy-header">
                  <div className="profile-hero__tenancy-icon">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h4 className="profile-hero__tenancy-title">Active Tenancy</h4>
                    <p className="profile-hero__tenancy-property">{contracts[0].fileName}</p>
                  </div>
                </div>
                <div className="profile-hero__tenancy-footer">
                  <span className="profile-hero__tenancy-expiry">
                    Uploaded {formatDate(contracts[0].createdAt)}
                  </span>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => router.push('/dashboard/contracts')}
                  >
                    View &amp; Manage
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
              const showWarning = isPersonal && !isProfileComplete

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
                      <Icon size={17} />
                    </div>
                    <span className="profile-menu-item__title">{s.title}</span>
                  </div>
                  <div className="profile-menu-item__right">
                    {showWarning && (
                      <div className="profile-menu-item__warning">
                        <AlertCircle size={14} color="#eab308" />
                      </div>
                    )}
                    <ChevronRight size={17} color="var(--text-muted)" />
                  </div>
                </div>
              )
            })}

            <div className="profile-menu-item profile-menu-item--logout" onClick={logout}>
              <div className="profile-menu-item__left">
                <div className="profile-menu-item__icon-wrap profile-menu-item__icon-wrap--logout">
                  <LogOut size={17} />
                </div>
                <span className="profile-menu-item__title">Sign Out</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed action button removed as per user request to integrate into personal details page header */}

      <style jsx>{`
        .profile-menu-page {
          --local-border: var(--border-solid);
          --local-surface: var(--surface);
          --local-surface2: var(--surface2);
          --card-radius: 20px;
          padding-bottom: 4rem;
        }

        .profile-fixed-actions {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.25rem 1.5rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
          background: var(--bg);
          border-top: 1px solid var(--local-border);
          z-index: 100;
          display: flex;
          justify-content: center;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
        }

        @media (min-width: 1024px) {
          .profile-fixed-actions {
            position: sticky;
            bottom: 24px;
            background: none;
            border: none;
            box-shadow: none;
            padding: 2rem 0;
            margin-top: 1rem;
            z-index: 50;
          }
        }

        .hidden { display: none; }
        /* Show and style back button for desktop parity */
        .dashboard__back {
          /* Inherits from global dashboard.css */
        }

        .profile-hero {
          background: var(--bg);
          border: 1px solid var(--local-border);
          border-radius: var(--card-radius);
          padding: 2.5rem 1.75rem 1.75rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        @media (min-width: 1024px) {
          .profile-menu-page {
            max-width: 860px;
            margin: 0 auto;
            padding-top: 2rem;
          }

          .dashboard__main-grid {
            display: flex !important;
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
            gap: 1.5rem;
          }

          .profile-hero {
            padding: 3.5rem 2rem 2.5rem;
          }

          .support-card {
            margin-top: 1rem;
            text-align: center;
            background: var(--local-surface);
          }
        }

        .profile-hero__avatar-wrap {
          position: relative;
          display: inline-block;
          margin-bottom: 1.25rem;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .profile-hero__avatar-wrap:hover {
          opacity: 0.9;
        }

        .profile-hero__avatar-edit {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: var(--clay);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--bg);
        }

        .profile-hero__name {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 0.3rem;
          letter-spacing: -0.02em;
        }

        .profile-hero__email {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0 0 1.75rem;
        }

        .profile-hero__tenancy {
          width: 100%;
          background: var(--local-surface);
          border-radius: 14px;
          padding: 1.25rem;
          text-align: left;
          border: 1px solid var(--local-border);
        }

        .profile-hero__tenancy-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .profile-hero__tenancy-icon {
          width: 34px;
          height: 34px;
          background: var(--clay-faint);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
          flex-shrink: 0;
        }

        .profile-hero__tenancy-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 0.2rem;
        }

        .profile-hero__tenancy-property {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .profile-hero__tenancy-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .profile-hero__tenancy-expiry {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .profile-menu-list {
          background: var(--bg);
          border-radius: var(--card-radius);
          border: 1px solid var(--local-border);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .profile-menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.1rem;
          border-radius: 14px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .profile-menu-item:hover {
          background: var(--local-surface);
          transform: translateY(-1px);
        }

        .profile-menu-item__left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .profile-menu-item__right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .profile-menu-item__icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }

        .profile-menu-item:hover .profile-menu-item__icon-wrap {
          background: var(--clay);
        }

        .profile-menu-item__icon-wrap :global(svg) {
          stroke: var(--clay);
          transition: stroke 0.15s ease;
        }

        .profile-menu-item:hover .profile-menu-item__icon-wrap {
          background: var(--clay);
        }

        .profile-menu-item:hover .profile-menu-item__icon-wrap :global(svg) {
          stroke: white;
        }
        .profile-menu-item__title {
          font-weight: 600;
          color: var(--text);
          font-size: 0.9rem;
        }

        .profile-menu-item__warning {
          display: flex;
          align-items: center;
        }

        .profile-menu-item--logout {
          margin-top: 0.375rem;
          border-top: 1px solid var(--local-border);
          border-radius: 0 0 14px 14px;
          padding-top: 1rem;
        }

        .profile-menu-item__icon-wrap--logout {
          background: var(--error-bg) !important;
          color: var(--error);
        }

        .profile-menu-item--logout .profile-menu-item__title {
          color: var(--error);
        }

        .profile-menu-item--logout:hover .profile-menu-item__icon-wrap--logout {
          background: var(--error) !important;
        }

        .profile-menu-item--logout:hover .profile-menu-item__icon-wrap--logout :global(svg) {
          color: white !important;
        }
      `}</style>
    </div>
  )
}
