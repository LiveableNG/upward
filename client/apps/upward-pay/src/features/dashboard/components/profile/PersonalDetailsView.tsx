'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { User, Pencil, Loader2, Calendar, Phone, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { PayPageShell } from '../payment/PayPageShell'
import { type UserProfile } from '../../types'

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const clean = dateStr.split('T')[0]
    const parts = clean.split('-')
    if (parts.length !== 3) return dateStr
    const [year, month, day] = parts
    const d = new Date(Number(year), Number(month) - 1, Number(day))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr || ''
  }
}

function cleanPhone(val: string): string {
  let cleaned = val.trim().replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.slice(1)
  } else if (cleaned.length >= 7 && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}

function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  if (trimmed.startsWith('+234') && trimmed.length === 14) {
    return `+234 ${trimmed.slice(4, 7)} ${trimmed.slice(7, 10)} ${trimmed.slice(10)}`
  }
  return trimmed
}

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
  const dateInputRef = useRef<HTMLInputElement>(null)

  const phoneRegex = useMemo(() => /^\+234\d{10}$/, [])

  // Date of birth ceiling: prevents choosing future years/dates
  const maxDobDate = useMemo(() => new Date().toISOString().split('T')[0], [])
  const minDobDate = '1900-01-01'

  const validatePhone = (val: string) => {
    if (!val || !val.trim()) return ''
    const cleaned = cleanPhone(val)
    if (!phoneRegex.test(cleaned)) {
      return 'Please enter a valid Nigerian phone number (e.g. +234 801 234 5678 or 08012345678)'
    }
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
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    })
  }, [user])

  const handleSave = async () => {
    const pErr = validatePhone(formData.phone || '')
    if (pErr) {
      toastError(pErr)
      return
    }

    if (formData.dateOfBirth) {
      const dobDate = new Date(formData.dateOfBirth)
      const today = new Date()
      if (isNaN(dobDate.getTime()) || dobDate > today) {
        toastError('Date of birth cannot be in the future.')
        return
      }
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
      const cleanedPhone = phone ? cleanPhone(phone) : ''
      const res = await api.updateProfile({
        firstName,
        lastName,
        email,
        phone: cleanedPhone || phone,
        address,
        gender,
        dateOfBirth: dateOfBirth ? dateOfBirth.split('T')[0] : undefined,
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
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    })
  }

  const headerAction = isEditing ? (
    <button
      type="button"
      className="pay-flow__header-action pay-flow__header-action--primary"
      onClick={handleSave}
      disabled={saving || hasValidationErrors}
      aria-label="Save profile changes"
    >
      {saving ? <Loader2 size={15} className="animate-spin" /> : 'Save'}
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
      hideNav
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
        </div>

        {isEditing ? (
          <div className="personal-form-grid">
            <div className="personal-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                placeholder="e.g. Alex"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>

            <div className="personal-field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                placeholder="e.g. Morgan"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="personal-field">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
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
              <div className="personal-input-wrap">
                <Phone size={16} className="personal-input-icon" />
                <input
                  id="phone"
                  type="tel"
                  className={validationErrors.phone ? 'personal-field__input--error' : ''}
                  value={formData.phone || ''}
                  placeholder="e.g. +234 801 234 5678"
                  onChange={(e) => {
                    const val = e.target.value
                    setFormData({ ...formData, phone: val })
                    setValidationErrors((prev) => ({ ...prev, phone: validatePhone(val) }))
                  }}
                />
              </div>
              {validationErrors.phone ? (
                <span className="personal-field__error">{validationErrors.phone}</span>
              ) : null}
            </div>

            <div className="personal-field">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <div
                className={`personal-date-picker ${validationErrors.dateOfBirth ? 'personal-date-picker--error' : ''} ${formData.dateOfBirth ? 'has-value' : ''}`}
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker?.()
                  } catch {
                    dateInputRef.current?.focus()
                  }
                }}
              >
                <div className="personal-date-picker__left">
                  <Calendar size={16} className="personal-date-picker__icon" />
                  <span
                    className={`personal-date-picker__text ${
                      !formData.dateOfBirth ? 'personal-date-picker__text--placeholder' : ''
                    }`}
                  >
                    {formData.dateOfBirth
                      ? formatDisplayDate(formData.dateOfBirth)
                      : 'Select date of birth (DD/MM/YYYY)'}
                  </span>
                </div>

                <div className="personal-date-picker__right">
                  {formData.dateOfBirth && (
                    <button
                      type="button"
                      className="personal-date-picker__clear"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFormData({ ...formData, dateOfBirth: '' })
                        setValidationErrors((prev) => ({ ...prev, dateOfBirth: '' }))
                      }}
                      aria-label="Clear date of birth"
                      title="Clear date of birth"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <span className="personal-date-picker__badge">
                    <Calendar size={12} />
                    <span>Pick</span>
                  </span>
                </div>

                <input
                  ref={dateInputRef}
                  id="dateOfBirth"
                  type="date"
                  min={minDobDate}
                  max={maxDobDate}
                  className="personal-date-picker__native"
                  value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val && val > maxDobDate) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        dateOfBirth: 'Date of birth cannot be in the future',
                      }))
                    } else {
                      setValidationErrors((prev) => ({ ...prev, dateOfBirth: '' }))
                    }
                    setFormData({ ...formData, dateOfBirth: val })
                  }}
                  aria-label="Date of Birth"
                />
              </div>
              {validationErrors.dateOfBirth ? (
                <span className="personal-field__error">{validationErrors.dateOfBirth}</span>
              ) : null}
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
                {formData.phone ? (
                  formatDisplayPhone(formData.phone)
                ) : (
                  <span className="personal-readonly-value--muted">Not set</span>
                )}
              </span>
            </div>

            <div className="personal-readonly-row">
              <span className="personal-readonly-label">Date of Birth</span>
              <span className="personal-readonly-value">
                {formData.dateOfBirth ? (
                  formatDisplayDate(formData.dateOfBirth)
                ) : (
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
    </PayPageShell>
  )
}
