'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { User, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { PayFlowPrimaryButton, PayPageShell } from '../payment/PayPageShell'
import { type UserProfile } from '../../types'

interface PersonalDetailsViewProps {
  user: UserProfile
  refreshUser: () => Promise<void>
  onBack: () => void
  initialEditing?: boolean
}

export function PersonalDetailsView({
  user,
  refreshUser,
  onBack,
  initialEditing = false,
}: PersonalDetailsViewProps) {
  const { success, error: toastError } = useToast()

  const [isEditing, setIsEditing] = useState(initialEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const phoneRegex = useMemo(() => /^\+234\d{10}$/, [])

  const validatePhone = (val: string) => {
    if (!val) return ''
    if (!phoneRegex.test(val)) return '+2348000000000'
    return ''
  }

  const hasValidationErrors = Object.values(validationErrors).some(Boolean)

  useEffect(() => {
    if (initialEditing) setIsEditing(true)
  }, [initialEditing])

  useEffect(() => {
    setFormData({
      ...user,
      address: user.address || '',
    })
  }, [user])

  const handleSave = async () => {
    const pErr = validatePhone(formData.phone || '')
    if (pErr) {
      toastError(`Your Phone Number: ${pErr}`)
      return
    }

    if (user.email?.endsWith('@upward.com')) {
      if (!formData.email || formData.email.trim() === '' || formData.email.endsWith('@upward.com')) {
        toastError('Please enter a valid email address to complete your profile.')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toastError('Please enter a valid email address.')
        return
      }
    }

    setSaving(true)
    try {
      const { firstName, lastName, email, phone, address, gender, dateOfBirth } = formData
      const res = await api.updateProfile({
        firstName,
        lastName,
        email,
        phone,
        address,
        gender,
        dateOfBirth,
      })
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
    setValidationErrors({})
    setFormData({
      ...user,
      address: user.address || '',
    })
  }

  const headerAction = isEditing ? (
    <button
      type="button"
      className="pay-flow__header-action pay-flow__header-action--primary"
      onClick={handleSave}
      disabled={saving || hasValidationErrors}
    >
      {saving ? '...' : 'Save'}
    </button>
  ) : (
    <button
      type="button"
      className="pay-flow__header-action pay-flow__header-action--icon"
      onClick={() => setIsEditing(true)}
      aria-label="Edit profile"
    >
      <Pencil size={16} />
    </button>
  )

  return (
    <PayPageShell
      title={isEditing ? 'Edit Profile' : 'Personal Details'}
      showBack
      onBack={isEditing ? handleCancel : onBack}
      rightElement={headerAction}
    >
      <section className="personal-card">
        <div className="personal-card__header">
          <div className="personal-card__header-main">
            <div className="personal-card__icon">
              <User size={20} />
            </div>
            <div>
              <h2 className="personal-card__title">Identity &amp; Contact</h2>
              <p className="personal-card__desc">Manage your core profile details.</p>
            </div>
          </div>
          {!isEditing ? (
            <button
              type="button"
              className="personal-card__edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={14} />
              Edit Profile
            </button>
          ) : null}
        </div>

        {isEditing ? (
          <div className="personal-form-grid">
            <div className="personal-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>

            <div className="personal-field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="personal-field">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="text"
                className={validationErrors.email ? 'personal-field__input--error' : ''}
                value={formData.email?.endsWith('@upward.com') ? '' : formData.email || ''}
                disabled={!user.email?.endsWith('@upward.com')}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData({ ...formData, email: val })
                  setValidationErrors((prev) => ({
                    ...prev,
                    email: !val
                      ? 'Email is required'
                      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
                        ? 'Invalid email address'
                        : '',
                  }))
                }}
              />
              {validationErrors.email ? (
                <span className="personal-field__error">{validationErrors.email}</span>
              ) : null}
            </div>

            <div className="personal-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                className={validationErrors.phone ? 'personal-field__input--error' : ''}
                value={formData.phone || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData({ ...formData, phone: val })
                  setValidationErrors((prev) => ({ ...prev, phone: validatePhone(val) }))
                }}
              />
              {validationErrors.phone ? (
                <span className="personal-field__error">{validationErrors.phone}</span>
              ) : null}
            </div>

            <div className="personal-field">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>

            <div className="personal-field">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
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
          </div>
        ) : (
          <div className="personal-readonly-list">
            <div className="personal-readonly-row">
              <span className="personal-readonly-label">First Name</span>
              <span className="personal-readonly-value">
                {formData.firstName || (
                  <span className="personal-readonly-value--muted">Not set</span>
                )}
              </span>
            </div>

            <div className="personal-readonly-row">
              <span className="personal-readonly-label">Last Name</span>
              <span className="personal-readonly-value">
                {formData.lastName || (
                  <span className="personal-readonly-value--muted">Not set</span>
                )}
              </span>
            </div>

            <div className="personal-readonly-row">
              <span className="personal-readonly-label">Email Address</span>
              <span className="personal-readonly-value">
                {user.email?.endsWith('@upward.com') ? (
                  <span className="personal-readonly-value--warning">
                    Not set — edit profile to add your email
                  </span>
                ) : (
                  user.email
                )}
              </span>
            </div>

            <div className="personal-readonly-row">
              <span className="personal-readonly-label">Phone Number</span>
              <span className="personal-readonly-value">
                {formData.phone || (
                  <span className="personal-readonly-value--muted">Not set</span>
                )}
              </span>
            </div>

            <div className="personal-readonly-row">
              <span className="personal-readonly-label">Date of Birth</span>
              <span className="personal-readonly-value">
                {formData.dateOfBirth || (
                  <span className="personal-readonly-value--muted">Not set</span>
                )}
              </span>
            </div>

            <div className="personal-readonly-row">
              <span className="personal-readonly-label">Gender</span>
              <span className="personal-readonly-value">
                {formData.gender || (
                  <span className="personal-readonly-value--muted">Not set</span>
                )}
              </span>
            </div>
          </div>
        )}
      </section>

      {isEditing ? (
        <div className="personal-sticky-actions">
          <button
            type="button"
            className="personal-sticky-actions__cancel"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <PayFlowPrimaryButton
            onClick={handleSave}
            disabled={saving || hasValidationErrors}
            loading={saving}
          >
            Save Changes
          </PayFlowPrimaryButton>
        </div>
      ) : null}
    </PayPageShell>
  )
}
