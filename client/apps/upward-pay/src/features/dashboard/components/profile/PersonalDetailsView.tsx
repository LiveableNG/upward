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
        isVerified: !!p.isVerified || !!p.isManaged,
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
          
          {/* Section 1: Core Details */}
          <section className="premium-card animate-slide-up">
            <div className="premium-card__header">
              <div className="premium-card__icon-wrap bg-clay-faint text-clay">
                <User size={20} />
              </div>
              <div>
                <h3 className="premium-card__title">Identity & Contact</h3>
                <p className="premium-card__desc">Manage your core profile details.</p>
              </div>
            </div>

            <div className="premium-form premium-form--grid">
              <div className="premium-field">
                <label className="premium-field__label">First Name</label>
                <div className="premium-field__input-wrap">
                  <User className="premium-field__icon" size={18} />
                  {isEditing ? (
                    <input
                      type="text"
                      className="premium-field__input"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  ) : (
                    <div className="premium-field__read-only">{formData.firstName || <span className="text-muted italic">Not Set</span>}</div>
                  )}
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Last Name</label>
                <div className="premium-field__input-wrap">
                  <User className="premium-field__icon" size={18} />
                  {isEditing ? (
                    <input
                      type="text"
                      className="premium-field__input"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  ) : (
                    <div className="premium-field__read-only">{formData.lastName || <span className="text-muted italic">Not Set</span>}</div>
                  )}
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Email Address</label>
                <div className="premium-field__input-wrap">
                  <Mail className="premium-field__icon" size={18} />
                  <div className="premium-field__read-only text-muted">{user.email}</div>
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Phone Number</label>
                <div className="premium-field__input-wrap">
                  <Phone className="premium-field__icon" size={18} />
                  {isEditing ? (
                    <>
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
                    </>
                  ) : (
                    <div className="premium-field__read-only">{formData.phone || <span className="text-muted italic">Not Set</span>}</div>
                  )}
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Date of Birth</label>
                <div className="premium-field__input-wrap">
                  <Calendar className="premium-field__icon" size={18} />
                  {isEditing ? (
                    <input
                      type="date"
                      className="premium-field__input"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  ) : (
                    <div className="premium-field__read-only">{formData.dateOfBirth || <span className="text-muted italic">Not Set</span>}</div>
                  )}
                </div>
              </div>

              <div className="premium-field">
                <label className="premium-field__label">Gender</label>
                <div className="premium-field__input-wrap">
                  <User className="premium-field__icon" size={18} />
                  {isEditing ? (
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
                  ) : (
                    <div className="premium-field__read-only">{formData.gender || <span className="text-muted italic">Not Set</span>}</div>
                  )}
                </div>
              </div>
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
              {isEditing && (
                <button
                  className="btn btn--secondary btn--sm btn--pill premium-add-btn"
                  onClick={() => setIsAddPropertyModalOpen(true)}
                >
                  <Plus size={14} className="mr-1" /> Add Property
                </button>
              )}
            </div>

            <div className="properties-list">
              {(formData.properties || []).length === 0 && (
                <div className="empty-state">
                  <Building2 size={32} className="text-muted mb-2" />
                  <p>No properties added yet.</p>
                  {isEditing && (
                    <button className="btn btn--ghost btn--sm mt-2" onClick={() => setIsAddPropertyModalOpen(true)}>
                      Add Your First Property
                    </button>
                  )}
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
                      {(prop.isVerified || prop.isManaged) && (
                        <div className="status-badge status-badge--shield" title="Verified Management">
                          <Shield size={12} />
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

                      {isEditing && (
                        <div className="prop-card__actions">
                          {(prop.isVerified || prop.isManaged) && (
                            <div className="managed-notice">
                              <Shield size={14} className="text-clay" />
                              <span>Verified by {prop.company?.name || prop.companyName}. Restricted editing.</span>
                            </div>
                          )}
                          <div className="flex gap-2 w-full justify-end">
                            {!(prop.isVerified || prop.isManaged) && (
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
                            {!(prop.isVerified || prop.isManaged) && (
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
                      )}
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
          max-width: 860px;
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
          gap: 2rem;
        }

        .premium-card {
          background: var(--surface);
          border: 1px solid var(--border-solid);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        }

        .premium-card__header {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-bottom: 2rem;
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

        /* Premium Form Fields */
        .premium-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .premium-form--grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .premium-form--grid {
            grid-template-columns: 1fr;
          }
        }

        .premium-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .premium-field__label {
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-left: 4px;
        }

        .premium-field__input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .premium-field__icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .premium-field__input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: var(--bg);
          border: 1.5px solid var(--border-solid);
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-field__input:focus {
          outline: none;
          border-color: var(--clay);
          box-shadow: 0 0 0 4px var(--clay-glow);
          background: var(--surface);
        }

        .premium-field__input--error {
          border-color: var(--error);
        }

        .premium-field__error-msg {
          position: absolute;
          bottom: -20px;
          left: 4px;
          font-size: 0.7rem;
          color: var(--error);
          font-weight: 600;
        }

        .premium-field__select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a8a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 44px;
        }

        .premium-field__read-only {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: transparent;
          border: 1.5px solid transparent;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        /* Property Cards */
        .properties-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .prop-card {
          background: var(--bg);
          border: 1px solid var(--border-solid);
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
          background: rgba(var(--surface-rgb), 0.9);
          backdrop-filter: blur(12px);
          padding: 1rem;
          border-radius: 20px;
          border: 1px solid var(--border-solid);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          margin-top: 2rem;
          z-index: 20;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .animate-fade-in {
          animation: slideUp 0.3s ease both;
        }
      `}</style>
    </div>
  )
}
