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
  Clock,
  Share2,
  Check,
  X,
  Loader2,
  Copy,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
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
  
  // Slug Logic States
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([])
  const [lastCheckedSlug, setLastCheckedSlug] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfile(user)
      setFormData({
        ...user,
        address: user.address || '',
        properties: user.properties?.map((p) => ({
          ...p,
          rentStartDate: p.rentStartDate ? p.rentStartDate.split('T')[0] : '',
          rentEndDate: p.rentEndDate ? p.rentEndDate.split('T')[0] : '',
          isPastTenancy: !!p.isPastTenancy,
          managerName: (p as any).manager?.firstName ? `${(p as any).manager.firstName} ${(p as any).manager.lastName || ''}`.trim() : (p as any).managerName,
          managerEmail: (p as any).manager?.email || (p as any).managerEmail,
          managerPhone: (p as any).manager?.phone || (p as any).managerPhone,
          companyName: (p as any).company?.name || (p as any).companyName,
          companyEmail: (p as any).company?.email || (p as any).companyEmail,
          companyPhone: (p as any).company?.phone || (p as any).companyPhone,
          location: {
            ...p.location,
            country: p.location?.country || '',
          },
        })) || [],
      })
      loadDocuments()
    }
  }, [user])

  useEffect(() => {
    const slug = formData.profileSlug
    if (!isEditing || !slug || slug === user?.profileSlug || slug === lastCheckedSlug) {
      if (slug === user?.profileSlug) setSlugStatus('available')
      return
    }

    if (slug.length < 3) {
      setSlugStatus('invalid')
      return
    }

    const handler = setTimeout(async () => {
      setSlugStatus('checking')
      try {
        const res = await api.checkSlug(slug)
        setLastCheckedSlug(slug)
        if (res.available) {
          setSlugStatus('available')
          setSlugSuggestions([])
        } else {
          setSlugStatus('taken')
          setSlugSuggestions(res.suggestions || [])
        }
      } catch (err) {
        setSlugStatus('idle')
      }
    }, 600)

    return () => clearTimeout(handler)
  }, [formData.profileSlug, isEditing, user?.profileSlug, lastCheckedSlug])

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
      for (let i = 0; i < formData.properties.length; i++) {
        const prop = formData.properties[i]
        const propNum = i + 1

        // 1. Mandatory Location Fields
        if (!prop.location?.address || !prop.location?.area) {
          toastError(`Property #${propNum}: Please provide a street address and area`)
          return
        }
        if (!prop.location?.state || !prop.location?.country) {
          toastError(`Property #${propNum}: Please select a state and country`)
          return
        }

        // 2. Mandatory Identity Fields (Dynamic: One must exist)
        if (!prop.companyName && !prop.managerName) {
          toastError(`Property #${propNum}: Please provide either a Management Company or a Manager Name`)
          return
        }

        // 3. Mandatory Dates & Positive Amount
        if (!prop.rentStartDate || !prop.rentEndDate) {
          toastError(`Property #${propNum}: Both Start and End dates are required`)
          return
        }
        
        if (!prop.rentAmount || prop.rentAmount <= 0) {
          toastError(`Property #${propNum}: Please provide a valid rent amount`)
          return
        }

        // 4. Date Logic: End must be after Start
        const start = new Date(prop.rentStartDate)
        const end = new Date(prop.rentEndDate)
        
        // Reset times for accurate dayComparison
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)

        if (end <= start) {
          toastError(`Property #${propNum}: End Date must be at least one day after Start Date`)
          return
        }
      }

      // 5. Slug Validation
      if (formData.profileSlug) {
        const slugRegex = /^[a-z0-9-]+$/
        if (!slugRegex.test(formData.profileSlug)) {
          toastError('Slug can only contain lowercase letters, numbers, and dashes')
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

  const handleCopyLink = async () => {
    const baseUrl = Capacitor.isNativePlatform() ? 'https://upward-pay.vercel.app' : window.location.origin
    const url = `${baseUrl}/profile/${formData.profileSlug || profile?.uuid}`
    
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied to clipboard')
    } catch (err) {
      toastError('Failed to copy link')
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
          statusBadge={null}
          showBack
          backLabel="Profile"
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
          <div className="personal-sections">
            {/* Section 1: Basic Information */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h3 className="profile-section__title">Identity & Contact</h3>
                <p className="profile-section__desc">Manage your core profile details.</p>
              </div>
              <div className="profile-section__body profile-section__body--grid">
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
            </section>

            {/* Section 2: Public Profile Visibility */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h3 className="profile-section__title">Public Portfolio Visibility</h3>
                <p className="profile-section__desc">Your verified credibility profile can be shared with managers or landlords using this unique link.</p>
              </div>
              <div className="profile-section__body profile-section__body--grid">
                <div className="share-url-preview bento-hero-pending--clay" style={{ 
                  gridColumn: '1 / -1', 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  background: 'var(--surface2)',
                  border: '1px solid var(--border-solid)',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Live Portfolio URL</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ wordBreak: 'break-all', fontWeight: 600, color: 'var(--clay)', fontSize: '0.9rem', flex: 1 }}>
                      {(() => {
                        const baseUrl = Capacitor.isNativePlatform() ? 'https://upward-pay.vercel.app' : window.location.origin
                        return `${baseUrl}/profile/${formData.profileSlug || profile.uuid}`
                      })()}
                    </div>
                    <button 
                      onClick={handleCopyLink}
                      style={{ 
                        background: 'var(--clay-faint)', 
                        color: 'var(--clay)', 
                        border: 'none', 
                        padding: '6px', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Copy Link"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div className="slug-input-container" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <DetailOrEdit
                    isEditing={isEditing}
                    icon={Share2}
                    label="Custom Profile Slug"
                    placeholder="e.g. john-doe-2025"
                    value={formData.profileSlug || ''}
                    onChange={(v) => setFormData({ ...formData, profileSlug: v.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') })}
                  />
                  {isEditing && formData.profileSlug && (
                    <div className="slug-status-indicator" style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '36px', 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {slugStatus === 'checking' && <Loader2 size={16} className="animate-spin text-clay" />}
                      {slugStatus === 'available' && <div className="flex items-center text-success"><Check size={16} /> <span style={{ color: '#22c55e' }}>Available</span></div>}
                      {slugStatus === 'taken' && <div className="flex items-center text-error"><X size={16} /> <span style={{ color: '#ef4444' }}>Taken</span></div>}
                      {slugStatus === 'invalid' && <span style={{ color: 'var(--text-muted)' }}>Too short</span>}
                    </div>
                  )}
                </div>

                {isEditing && slugStatus === 'taken' && slugSuggestions.length > 0 && (
                  <div className="slug-suggestions" style={{ gridColumn: '1 / -1', marginTop: '-8px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Suggested alternatives:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {slugSuggestions.map(s => (
                        <button 
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, profileSlug: s })}
                          style={{ 
                            background: 'var(--clay-faint)', 
                            color: 'var(--clay)', 
                            border: '1px solid var(--clay)',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="info-box" style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Lowercase letters, numbers, and dashes only. If empty, your system UUID will be used as the default link.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Properties */}
            <section className="profile-section">
              <div className="profile-section__header flex-row">
                <div>
                  <h3 className="profile-section__title">Property Management</h3>
                  <p className="profile-section__desc">Your current or previous residential assets used to build your credibility profile.</p>
                </div>
                {isEditing && (
                  <button
                    className="btn btn--secondary btn--sm btn--pill"
                    onClick={() => {
                      const newProps = [
                        ...(formData.properties || []),
                        { address: '', rentEndDate: '', rentStartDate: '', isManaged: false, isPastTenancy: false, location: { country: '', state: '', area: '' } },
                      ]
                      setFormData({ ...formData, properties: newProps })
                    }}
                  >
                    <Plus size={14} className="mr-1" /> Add
                  </button>
                )}
              </div>

              <div className="properties-list">
                {(formData.properties || []).map((prop: any, idx: number) => (
                  <div key={idx} className={`property-item${expandedProps[idx] ? ' property-item--open' : ''} ${prop.isPastTenancy ? 'property-item--past' : ''}`}>
                    <div 
                      className="property-item__header"
                      onClick={() => setExpandedProps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    >
                      <div className="flex items-center gap-4">
                        <div className="property-item__index">{idx + 1}</div>
                        <div>
                          <h4 className="property-item__title">
                            {prop.location?.address 
                              ? `${prop.location.address}${prop.location.area ? `, ${prop.location.area}` : ''}`
                              : prop.location?.area || 'New Property'}
                          </h4>
                          {!expandedProps[idx] && (
                            <p className="property-item__summary">
                              {[prop.location?.state, prop.location?.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {prop.isManaged && (
                          <div className="managed-indicator" title="Verified Management">
                            <Shield size={12} />
                          </div>
                        )}
                        {prop.isPastTenancy && (
                          <div className="past-indicator">Past</div>
                        )}
                        <ChevronRight size={16} className={`property-item__chevron ${expandedProps[idx] ? 'rotated' : ''}`} />
                      </div>
                    </div>

                    {expandedProps[idx] && (
                      <div className="property-item__body animate-fade-in">
                         {isEditing && !prop.isManaged && (formData.properties || []).length > 1 && (
                          <button
                            className="property-item__delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              const newProps = [...(formData.properties || [])]
                              newProps.splice(idx, 1)
                              setFormData({ ...formData, properties: newProps })
                            }}
                          >
                            <Trash2 size={14} /> Remove Property
                          </button>
                        )}

                        {isEditing && prop.isManaged && (
                          <div className="managed-notice">
                            <AlertCircle size={14} />
                            <span>This property is verified by {prop.company?.name || prop.companyName}.</span>
                          </div>
                        )}

                        <div className="property-item__form">
                          <DetailOrEdit
                            isEditing={isEditing && !prop.isManaged}
                            icon={MapPin}
                            label="Street Address *"
                            placeholder="e.g. 12 Adeola Odeku"
                            value={prop.location?.address || ''}
                            onChange={(v) => handlePropUpdate(idx, 'location.address', v)}
                          />
                          <div className="grid-2">
                             <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={MapPin}
                              label="Subarea"
                              placeholder="e.g. Victoria Island"
                              value={prop.location?.subarea || ''}
                              onChange={(v) => handlePropUpdate(idx, 'location.subarea', v)}
                            />
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={MapPin}
                              label="Area *"
                              placeholder="e.g. Lekki"
                              value={prop.location?.area || ''}
                              onChange={(v) => handlePropUpdate(idx, 'location.area', v)}
                            />
                          </div>
                          <div className="grid-2">
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Shield}
                              label="Country *"
                              type="select"
                              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                              value={prop.location?.country || ''}
                              onChange={(v) => handlePropUpdate(idx, 'location.country', v)}
                            />
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={MapPin}
                              label="State *"
                              type="select"
                              options={
                                STATES[prop.location?.country || 'NG']?.map((s) => ({ value: s, label: s })) || []
                              }
                              value={prop.location?.state || ''}
                              onChange={(v) => handlePropUpdate(idx, 'location.state', v)}
                            />
                          </div>
                          
                          <div className="divider-sm" />

                          <div className="property-item__status-toggle">
                            <DetailOrEdit
                              isEditing={isEditing}
                              icon={Clock}
                              label="Is this a past tenancy?"
                              type="select"
                              options={[
                                { value: 'false', label: 'No, I currently live here' },
                                { value: 'true', label: 'Yes, I have moved out' },
                              ]}
                              value={prop.isPastTenancy ? 'true' : 'false'}
                              onChange={(v) => handlePropUpdate(idx, 'isPastTenancy', v === 'true')}
                            />
                          </div>

                          <div className="grid-2">
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Calendar}
                              label="Rent Start Date *"
                              type="date"
                              value={prop.rentStartDate || ''}
                              displayValue={prop.rentStartDate ? formatDate(prop.rentStartDate) : ''}
                              onChange={(v) => handlePropUpdate(idx, 'rentStartDate', v)}
                            />
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Calendar}
                              label={`${prop.isPastTenancy ? "Tenancy End Date" : "Rent Due Date"} *`}
                              type="date"
                              value={prop.rentEndDate || ''}
                              displayValue={prop.rentEndDate ? formatDate(prop.rentEndDate) : ''}
                              onChange={(v) => handlePropUpdate(idx, 'rentEndDate', v)}
                            />
                          </div>
                          <div className="grid-2">
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Building}
                              label="Rent Amount *"
                              value={prop.rentAmount?.toString() || ''}
                              displayValue={prop.rentAmount ? formatCurrency(prop.rentAmount, prop.currency || 'NGN') : ''}
                              onChange={(v) => handlePropUpdate(idx, 'rentAmount', parseFloat(v) || 0)}
                            />
                          </div>

                           <div className="grid-2">
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Building}
                              label={`Management Co.${!prop.managerName ? ' *' : ''}`}
                              value={prop.companyName || ''}
                              onChange={(v) => handlePropUpdate(idx, 'companyName', v)}
                            />
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={UserCheck}
                              label={`Manager Name${!prop.companyName ? ' *' : ''}`}
                              value={prop.managerName || ''}
                              onChange={(v) => handlePropUpdate(idx, 'managerName', v)}
                            />
                          </div>
                          
                          <div className="grid-2">
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Phone}
                              label="Manager Phone"
                              placeholder="Manager's active phone"
                              value={prop.managerPhone || ''}
                              onChange={(v) => handlePropUpdate(idx, 'managerPhone', v)}
                            />
                            <DetailOrEdit
                              isEditing={isEditing && !prop.isManaged}
                              icon={Mail}
                              label="Manager Email"
                              placeholder="Manager's active email"
                              value={prop.managerEmail || ''}
                              onChange={(v) => handlePropUpdate(idx, 'managerEmail', v)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {isEditing && (
              <div className="profile-actions">
                <button
                  className="btn btn--outline"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({ ...(profile as any), properties: (user as any).properties || [] })
                  }}
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

        <style jsx>{`
          .profile-page, .profile-menu-page {
            --section-bg: var(--surface);
            --item-bg: var(--bg);
            --border-soft: var(--border-solid);
            --radius-main: 24px;
            --radius-item: 16px;
          }

          .property-item--past {
            opacity: 0.65;
            background: var(--surface2) !important;
          }

          .past-indicator {
            background: var(--text-muted);
            color: white;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 20px;
            text-transform: uppercase;
          }

          .profile-content-scroll {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem 8rem;
          }

          /* Profile Shell (Menu View) */
          .profile-shell {
            max-width: 800px;
            margin: 0 auto;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .profile-hero {
            background: var(--section-bg);
            border-radius: var(--radius-main);
            padding: 3rem 2rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .profile-hero__avatar-wrap {
            position: relative;
            margin-bottom: 1.5rem;
            cursor: pointer;
          }

          .profile-hero__avatar-edit {
            position: absolute;
            bottom: 4px;
            right: 4px;
            background: var(--clay);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid var(--section-bg);
          }

          .profile-hero__name {
            font-size: 1.5rem;
            font-weight: 800;
            margin: 0 0 0.25rem;
            letter-spacing: -0.02em;
          }

          .profile-hero__email {
            font-size: 0.9rem;
            color: var(--text-muted);
            margin: 0 0 1.5rem;
          }

          .profile-hero__tenancy {
            width: 100%;
            max-width: 400px;
            background: var(--item-bg);
            padding: 1.25rem;
            border-radius: var(--radius-item);
            border: 1px solid var(--border-soft);
          }

          .profile-hero__tenancy-header {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .profile-hero__tenancy-icon {
            width: 40px;
            height: 40px;
            background: var(--clay-faint);
            color: var(--clay);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .profile-hero__tenancy-title {
            font-size: 0.85rem;
            font-weight: 700;
            margin: 0 0 2px;
          }

          .profile-hero__tenancy-property {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin: 0;
          }

          .profile-hero__tenancy-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px dashed var(--border-soft);
            padding-top: 1rem;
          }

          .profile-hero__tenancy-expiry {
            font-size: 0.7rem;
            color: var(--text-muted);
          }

          /* Menu List */
          .profile-menu-list {
            background: var(--section-bg);
            border-radius: var(--radius-main);
            padding: 0.75rem;
          }

          .profile-menu-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.125rem 1rem;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .profile-menu-item:hover {
            background: var(--item-bg);
            transform: translateX(4px);
          }

          .profile-menu-item__left {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .profile-menu-item__icon-wrap {
            width: 40px;
            height: 40px;
            background: var(--item-bg);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            transition: all 0.2s;
          }

          .profile-menu-item:hover .profile-menu-item__icon-wrap {
            background: var(--clay);
            color: white;
          }

          .profile-menu-item__title {
            font-weight: 600;
            font-size: 0.95rem;
          }

          .profile-menu-item--logout {
            margin-top: 0.5rem;
            border-top: 1px solid var(--border-soft);
            padding-top: 1rem;
            color: var(--error);
          }

          .profile-menu-item__icon-wrap--logout {
            background: var(--bg);
            color: var(--error);
          }

          .profile-menu-item--logout:hover .profile-menu-item__icon-wrap--logout {
            background: var(--error);
            color: white;
          }

          /* Personal Sections View */
          .personal-sections {
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }

          .profile-section {
            background: var(--section-bg);
            border-radius: var(--radius-main);
            padding: 2rem;
          }

          .profile-section__header {
            margin-bottom: 2rem;
          }
          
          .profile-section__header.flex-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .profile-section__title {
            font-size: 1.1rem;
            font-weight: 800;
            margin: 0 0 0.25rem;
          }

          .profile-section__desc {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin: 0;
          }

          .profile-section__body--grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          /* Property Items */
          .properties-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .property-item {
            background: var(--item-bg);
            border-radius: var(--radius-item);
            border: 1px solid var(--border-soft);
            overflow: hidden;
            transition: border-color 0.2s;
          }

          .property-item--open {
            border-color: var(--clay);
          }

          .property-item__header {
            padding: 1.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
          }

          .property-item__index {
            width: 32px;
            height: 32px;
            background: var(--section-bg);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.85rem;
            color: var(--text-muted);
          }

          .property-item__title {
            font-size: 0.95rem;
            font-weight: 700;
            margin: 0;
          }

          .property-item__summary {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin: 2px 0 0;
          }

          .managed-indicator {
            width: 24px;
            height: 24px;
            background: var(--clay-faint);
            color: var(--clay);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .property-item__chevron {
            color: var(--text-muted);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .property-item__chevron.rotated {
            transform: rotate(90deg);
          }

          .property-item__body {
            padding: 0 1.5rem 1.5rem;
          }

          .property-item__delete {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px;
            margin-bottom: 1.5rem;
            background: #fff5f5;
            color: #e53e3e;
            border: 1px solid #fed7d7;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
          }

          .property-item__form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.25rem;
          }

          .divider-sm {
            height: 1px;
            background: var(--border-soft);
            margin: 0.5rem 0;
          }

          .managed-notice {
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--section-bg);
            padding: 12px;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            font-size: 0.8rem;
            color: var(--text-muted);
          }

          .status-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            background: white;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 700;
            box-shadow: var(--shadow-sm);
          }

          .status-badge--complete { color: var(--success); }
          .status-badge--incomplete { color: var(--warning); }
          
          .status-badge__dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
          }

          .profile-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 2rem;
          }

          .hidden { display: none; }

          @media (max-width: 768px) {
            .profile-section__body--grid, .grid-2, .profile-actions {
              grid-template-columns: 1fr;
            }
            .profile-section {
              padding: 1.5rem;
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

      <div className="profile-shell">
        <div className="profile-hero">
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
                <div className="text-left">
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
