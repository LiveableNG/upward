'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { User, Phone, Mail, Calendar, Shield,CreditCard, MapPin, Plus, Trash2, Edit2, Loader2, Pencil, ChevronRight, AlertCircle, Building2, Globe, FileText, Briefcase } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { PageHeader } from '@/components/common/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AddPropertyModal } from './AddPropertyModal'
import { type UserProfile } from '../../types'

interface PersonalDetailsViewProps {
  user: UserProfile
  refreshUser: () => Promise<void>
  onBack: () => void
}

export function PersonalDetailsView({ user, refreshUser, onBack }: PersonalDetailsViewProps) {
  const { success, error: toastError } = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [expandedProps, setExpandedProps] = useState<Record<number, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)

  const phoneRegex = useMemo(() => /^\+234\d{10}$/, [])

  const validatePhone = (val: string) => {
    if (!val) return ''
    if (!phoneRegex.test(val)) return '+2348000000000'
    return ''
  }

  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
    const initialExpanded: Record<number, boolean> = {}
    user.properties?.forEach((_, idx) => {
      initialExpanded[idx] = isDesktop
    })
    setExpandedProps(initialExpanded)

    setFormData({
      ...user,
      address: user.address || '',
      properties: user.properties?.map((p: any) => ({
        ...p,
        rentStartDate: p.rentStartDate ? p.rentStartDate.split('T')[0] : '',
        rentEndDate: p.rentEndDate ? p.rentEndDate.split('T')[0] : '',
        isPastTenancy: !!p.isPastTenancy,
        isVerified: !!p.isVerified,
        managerName: p.manager?.firstName ? `${p.manager.firstName} ${p.manager.lastName || ''}`.trim() : p.managerName,
        managerPhone: p.manager?.phone || p.managerPhone,
        managerEmail: p.manager?.email || p.managerEmail,
        companyName: p.company?.name || p.companyName,
        location: { ...p.location, country: p.location?.country || '' },
      })) || [],
    })
  }, [user])

  const handleSave = async () => {
    const pErr = validatePhone(formData.phone || '')
    if (pErr) {
      toastError(`Your Phone Number: ${pErr}`)
      return
    }

    if (formData.properties) {
      for (let i = 0; i < formData.properties.length; i++) {
        const prop = formData.properties[i]
        const propNum = i + 1

        const mpErr = validatePhone(prop.managerPhone || '')
        if (mpErr) {
          toastError(`Property #${propNum} Manager Phone: ${mpErr}`)
          return
        }

        if (!prop.location?.address || !prop.location?.area) {
          toastError(`Property #${propNum}: Please provide a street address and area`)
          return
        }
        if (!prop.location?.state || !prop.location?.country) {
          toastError(`Property #${propNum}: Please select a state and country`)
          return
        }
        if (!prop.companyName && !prop.managerName) {
          toastError(`Property #${propNum}: Please provide either a Management Company or a Manager Name`)
          return
        }
        if (!prop.rentStartDate || !prop.rentEndDate) {
          toastError(`Property #${propNum}: Both Start and End dates are required`)
          return
        }
        if (!prop.rentAmount || prop.rentAmount <= 0) {
          toastError(`Property #${propNum}: Please provide a valid rent amount`)
          return
        }

        const start = new Date(prop.rentStartDate)
        const end = new Date(prop.rentEndDate)
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)
        if (end <= start) {
          toastError(`Property #${propNum}: End Date must be at least one day after Start Date`)
          return
        }
      }
    }

    setSaving(true)
    try {
      const res = await api.updateProfile(formData)
      if (res.success) {
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

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      ...user,
      properties: user.properties || []
    })
  }

  return (
    <div className="personal-details-view dashboard--nav-offset">
      <PageHeader
        title={isEditing ? 'Edit Profile' : 'Personal Details'}
        showBack
        backLabel="Profile"
        onBack={isEditing ? handleCancel : onBack}
        rightElement={
          isEditing ? (
            <button 
              className="btn btn--primary btn--sm btn--pill" 
              onClick={handleSave}
              disabled={saving || Object.values(validationErrors).some(v => !!v)}
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
      />

      <AddPropertyModal 
        isOpen={isAddPropertyModalOpen} 
        onClose={() => {
          setIsAddPropertyModalOpen(false)
          setSelectedProperty(null)
        }} 
        onSuccess={() => {
          refreshUser()
        }} 
        initialData={selectedProperty}
      />

      <div className="personal-content">
        <div className="personal-sections">
          
          {/* Section 1: Identity & Contact */}
          <section className="premium-card animate-slide-up">
            <div className="premium-card__header premium-card__header--split">
              <div className="flex gap-4 items-center">
                <div className="premium-card__icon-wrap bg-clay-faint text-clay">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="premium-card__title">Identity & Contact</h3>
                  <p className="premium-card__desc">Manage your core profile details.</p>
                </div>
              </div>
              {!isEditing && (
                <button 
                  className="btn btn--secondary btn--sm btn--pill desktop-only" 
                  onClick={() => setIsEditing(true)}
                  title="Edit Profile"
                >
                  <Pencil size={14} className="mr-1" /> Edit Profile
                </button>
              )}
            </div>

            <div className={isEditing ? "premium-form premium-form--grid" : "premium-details-list"}>
              {isEditing ? (
                <>
                  <div className="premium-field">
                    <label className="premium-field__label">First Name</label>
                    <input
                      type="text"
                      className="premium-field__input"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Last Name</label>
                    <input
                      type="text"
                      className="premium-field__input"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Email Address</label>
                    <input
                      type="text"
                      className="premium-field__input text-muted"
                      value={user.email}
                      disabled
                    />
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Phone Number</label>
                    <input
                      type="tel"
                      className={`premium-field__input ${validationErrors.phone ? 'premium-field__input--error' : ''}`}
                      value={formData.phone || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData({ ...formData, phone: val })
                        setValidationErrors(prev => ({ ...prev, phone: validatePhone(val) }))
                      }}
                    />
                    {validationErrors.phone && <span className="premium-field__error-msg">{validationErrors.phone}</span>}
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Date of Birth</label>
                    <input
                      type="date"
                      className="premium-field__input"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>

                  <div className="premium-field">
                    <label className="premium-field__label">Gender</label>
                    <select
                      className="premium-field__input premium-field__select"
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="premium-details-list">
                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">First Name</span>
                    <span className="premium-field__value--readonly">{formData.firstName || <span className="text-muted italic">Not Set</span>}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Last Name</span>
                    <span className="premium-field__value--readonly">{formData.lastName || <span className="text-muted italic">Not Set</span>}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Email Address</span>
                    <span className="premium-field__value--readonly text-muted">{user.email}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Phone Number</span>
                    <span className="premium-field__value--readonly">{formData.phone || <span className="text-muted italic">Not Set</span>}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Date of Birth</span>
                    <span className="premium-field__value--readonly">{formData.dateOfBirth || <span className="text-muted italic">Not Set</span>}</span>
                  </div>

                  <div className="premium-field--readonly">
                    <span className="premium-field__label--readonly">Gender</span>
                    <span className="premium-field__value--readonly">{formData.gender || <span className="text-muted italic">Not Set</span>}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Properties */}
          <section className="premium-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="premium-card__header premium-card__header--split">
              <div className="flex gap-4 items-center">
                <div className="premium-card__icon-wrap bg-clay-faint text-clay">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="premium-card__title">Property Management</h3>
                  <p className="premium-card__desc">Residential assets verifying your credibility.</p>
                </div>
              </div>
              <button
                className="btn btn--secondary btn--sm btn--pill premium-add-btn"
                onClick={() => setIsAddPropertyModalOpen(true)}
              >
                <Plus size={14} className="mr-1" /> Add Property
              </button>
            </div>

            <div className="properties-list">
              {(formData.properties || []).length === 0 && (
                <div className="empty-state">
                  <Building2 size={32} className="text-muted mb-2" />
                  <p>No properties added yet.</p>
                  <button className="btn btn--ghost btn--sm mt-2" onClick={() => setIsAddPropertyModalOpen(true)}>
                    Add Your First Property
                  </button>
                </div>
              )}
              
              {(formData.properties || []).map((prop: any, idx: number) => (
                <div key={idx} className={`prop-card ${expandedProps[idx] ? 'prop-card--open' : ''} ${prop.isPastTenancy ? 'prop-card--past' : ''} ${prop.verificationStatus === 'REJECTED' ? 'prop-card--rejected' : ''}`}>
                  <div className="prop-card__header" onClick={() => setExpandedProps(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                    <div className="prop-card__header-main">
                      <div className="prop-card__index">{idx + 1}</div>
                      <div className="prop-card__title-group">
                        <h4 className="prop-card__title">
                          {prop.location?.address 
                            ? `${prop.location.address}${prop.location.area ? `, ${prop.location.area}` : ''}`
                            : prop.location?.area || 'New Property'}
                        </h4>
                        {!expandedProps[idx] && (
                          <p className="prop-card__subtitle">
                            {[prop.location?.state, prop.location?.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="prop-card__status-group">
                      {prop.isVerified && (
                        <div className="status-badge status-badge--shield" title="Verified Management">
                          <Shield size={12} />
                        </div>
                      )}
                      {!prop.isVerified && prop.verificationStatus === 'PENDING' && (
                        <div className="status-badge status-badge--pending" title="Verification Pending">
                          Pending Verification
                        </div>
                      )}
                      {prop.isPastTenancy && (
                        <div className="status-badge status-badge--past">Past</div>
                      )}
                      {prop.verificationStatus === 'REJECTED' && (
                        <div className="status-badge status-badge--rejected">Verification Declined</div>
                      )}
                      <div className={`prop-card__chevron ${expandedProps[idx] ? 'prop-card__chevron--rotated' : ''}`}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  {expandedProps[idx] && (
                    <div className="prop-card__body animate-fade-in">
                      <div className="prop-card__grid">
                        <div className="prop-detail-box">
                          <div className="prop-detail-icon"><CreditCard size={14} /></div>
                          <div>
                            <span className="prop-detail-label">Rent Amount</span>
                            <span className="prop-detail-value">{prop.rentAmount ? formatCurrency(prop.rentAmount, prop.currency || 'NGN') : 'Not Set'}</span>
                          </div>
                        </div>
                        <div className="prop-detail-box">
                          <div className="prop-detail-icon"><Calendar size={14} /></div>
                          <div>
                            <span className="prop-detail-label">Tenancy Dates</span>
                            <span className="prop-detail-value">{prop.rentStartDate ? formatDate(prop.rentStartDate) : '-'} to {prop.rentEndDate ? formatDate(prop.rentEndDate) : '-'}</span>
                          </div>
                        </div>
                        <div className="prop-detail-box">
                          <div className="prop-detail-icon"><User size={14} /></div>
                          <div>
                            <span className="prop-detail-label">Manager Name</span>
                            <span className="prop-detail-value">{prop.managerName || 'Not Set'}</span>
                          </div>
                        </div>
                        <div className="prop-detail-box">
                          <div className="prop-detail-icon"><Briefcase size={14} /></div>
                          <div>
                            <span className="prop-detail-label">Management Company</span>
                            <span className="prop-detail-value">{prop.companyName || 'Not Set'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="prop-card__actions">
                        {prop.isVerified && (
                          <div className="managed-notice">
                            <Shield size={14} className="text-clay" />
                            <span>Verified by {prop.company?.name || prop.companyName}. Restricted editing.</span>
                          </div>
                        )}
                        <div className="flex gap-2 w-full justify-end">
                          {isEditing && !prop.isVerified && (
                            <button
                              className="btn btn--outline btn--sm text-red-500 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                const newProps = [...(formData.properties || [])]
                                newProps.splice(idx, 1)
                                setFormData({ ...formData, properties: newProps })
                              }}
                            >
                              <Trash2 size={14} className="mr-1" /> Remove
                            </button>
                          )}
                          {!prop.isVerified && (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProperty(prop)
                                setIsAddPropertyModalOpen(true)
                              }}
                            >
                              <Edit2 size={14} className="mr-1" /> {prop.verificationStatus === 'REJECTED' ? 'Edit & Retry' : 'Edit'}
                            </button>
                          )}
                        </div>
                        {prop.verificationStatus === 'REJECTED' && (
                          <div className="rejection-alert">
                            <AlertCircle size={14} />
                            <span>
                              {prop.rejectionReason || "Your connection request was declined. Please verify the manager's contact details and retry."}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {isEditing && (
            <div className="floating-action-bar animate-slide-up">
              <button className="btn btn--outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving || Object.values(validationErrors).some(v => !!v)}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .personal-details-view {
          max-width: 640px;
          margin: 0 auto;
          padding-top: 1rem;
        }

        @media (min-width: 1024px) {
          .personal-details-view {
            padding-top: 2rem;
          }
        }

        .personal-content {
          padding: 1rem 1rem 10rem;
        }

        @media (min-width: 768px) {
          .personal-content {
            padding: 2rem 1.5rem 10rem;
          }
        }

        .personal-sections {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .premium-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }

        .premium-card__header {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .premium-card__header--split {
          justify-content: space-between;
        }

        @media (max-width: 640px) {
          .premium-card__header--split {
            flex-direction: column;
            align-items: flex-start;
          }
          .premium-add-btn {
            width: 100%;
            justify-content: center;
          }
        }

        .premium-card__icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .premium-card__title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 4px;
        }

        .premium-card__desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Premium Form Fields & Lists */
        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .premium-form--grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .premium-form--grid {
            grid-template-columns: 1fr;
          }
        }

        .premium-details-list {
          display: flex;
          flex-direction: column;
        }

        .premium-field--readonly {
          display: flex;
          flex-direction: column;
          padding: 1rem 0.5rem;
          border-bottom: 1px solid var(--border);
        }

        .premium-field--readonly:last-child {
          border-bottom: none;
        }

        .premium-field__label--readonly {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .premium-field__value--readonly {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        .premium-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .premium-field__label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-left: 4px;
        }

        .premium-field__input {
          width: 100%;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          transition: all 0.2s ease;
        }

        .premium-field__input:focus {
          outline: none;
          border-color: var(--clay);
          background: var(--bg);
          box-shadow: 0 0 0 4px var(--clay-glow);
        }

        .premium-field__input--error {
          border-color: var(--error);
        }

        .premium-field__error-msg {
          font-size: 0.7rem;
          color: var(--error);
          font-weight: 600;
          margin-top: 4px;
          margin-left: 4px;
        }

        .premium-field__select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 44px;
        }

        /* Desktop & Helpers */
        .desktop-only {
          display: none !important;
        }
        @media (min-width: 1024px) {
          .desktop-only {
            display: flex !important;
          }
        }

        /* Property Cards */
        .properties-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .prop-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .prop-card--open {
          border-color: var(--clay);
          box-shadow: 0 4px 20px rgba(var(--clay-rgb), 0.1);
        }

        .prop-card--past {
          opacity: 0.75;
          background: var(--surface2);
        }

        .prop-card--rejected {
          border-color: #ef4444;
          background: #fffafa;
        }

        .prop-card__header {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .prop-card__header-main {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .prop-card__index {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--surface2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .prop-card__title {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 2px;
          color: var(--text);
        }

        .prop-card__subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }

        .prop-card__status-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .status-badge--shield {
          background: var(--clay-faint);
          color: var(--clay);
          padding: 6px;
          border-radius: 50%;
        }

        .status-badge--past {
          background: var(--text-muted);
          color: white;
        }
        
        .status-badge--rejected {
          background: #ef4444;
          color: white;
          font-size: 9px;
        }
        
        .status-badge--pending {
          background: #fef3c7;
          color: #d97706;
          font-size: 9px;
        }

        .prop-card__chevron {
          color: var(--text-muted);
          transition: transform 0.3s;
        }

        .prop-card__chevron--rotated {
          transform: rotate(90deg);
        }

        .prop-card__body {
          padding: 0 1.5rem 1.5rem;
        }

        .prop-card__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          background: var(--surface2);
          padding: 1.25rem;
          border-radius: 14px;
          border: 1px solid var(--border-solid);
          margin-bottom: 1.25rem;
        }

        @media (max-width: 640px) {
          .prop-card__grid {
            grid-template-columns: 1fr;
          }
        }

        .prop-detail-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .prop-detail-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: var(--bg);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .prop-detail-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .prop-detail-value {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .prop-card__actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-end;
        }

        .managed-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--clay-faint);
          border-radius: 10px;
          font-size: 0.8rem;
          color: var(--clay);
          width: 100%;
        }

        .managed-notice span { font-size: 0.75rem; font-weight: 500; }
        
        .rejection-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #FEF2F2;
          border: 1px solid #FEE2E2;
          border-radius: 12px;
          color: #991B1B;
          font-size: 0.8rem;
          font-weight: 500;
          margin-top: 1rem;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: var(--surface2);
          border-radius: 16px;
          border: 1px dashed var(--border-solid);
          text-align: center;
          color: var(--text-muted);
        }

        /* Floating Action Bar */
        .floating-action-bar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          position: sticky;
          bottom: 24px;
          background: var(--bg);
          padding: 1rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          margin-top: 2rem;
          z-index: 20;
        }

        .hidden { display: none; }
        .text-muted { color: var(--text-muted); }
        .italic { font-style: italic; }
      `}</style>
    </div>
  )
}
