'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getMe } from '@/features/auth/services/authService'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { DatePicker } from '@/features/auth/component/signup/DatePicker'
import {
  getIdentityVerificationPath,
  needsIdentityVerification,
  PHONE_REGEX,
} from '@/features/dashboard/utils/profileCompletion'
import { SETUP_PATHS } from '../setupPaths'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'

export function PhoneSetupScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : ''
  )

  useEffect(() => {
    if (user) {
      if (user.firstName && !firstName) setFirstName(user.firstName)
      if (user.lastName && !lastName) setLastName(user.lastName)
      if (user.phone && !phone) setPhone(user.phone)
      if (user.dateOfBirth && !dateOfBirth) setDateOfBirth(user.dateOfBirth.split('T')[0])
    }
  }, [user])

  const submitMutation = useMutation({
    mutationFn: async () => {
      let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '')
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+234' + cleaned.slice(1)
      } else if (cleaned.length >= 7 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned
      }

      if (!PHONE_REGEX.test(cleaned)) {
        throw new Error('Enter a valid phone number in international format (e.g. +2348030000000).')
      }
      if (!dateOfBirth) {
        throw new Error('Please enter your date of birth.')
      }

      await api.updateProfile({
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        phone: cleaned,
        dateOfBirth,
      })
    },
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      toast.success('Your personal details have been saved.', 'Saved')
      const freshUser = await getMe()
      const nextPath = needsIdentityVerification(freshUser)
        ? getIdentityVerificationPath(SETUP_PATHS.dashboard)
        : SETUP_PATHS.dashboard
      router.push(nextPath)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save. Please try again.', 'Error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '')
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '+234' + cleaned.slice(1)
    } else if (cleaned.length >= 7 && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }

    if (!PHONE_REGEX.test(cleaned)) {
      toast.error('Enter a valid phone number in international format (e.g. +2348030000000).', 'Invalid Phone')
      return
    }
    if (!dateOfBirth) {
      toast.error('Please enter your date of birth.', 'Date of birth required')
      return
    }
    submitMutation.mutate()
  }

  return (
    <SetupPageShell
      title="Personal details"
      subtitle="Complete your profile to build credibility and secure your account."
      onBack={() => router.push(SETUP_PATHS.dashboard)}
      footer={
        <SetupPrimaryButton onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Saving…' : 'Save details'}
          {!submitMutation.isPending && <ArrowRight size={18} aria-hidden />}
        </SetupPrimaryButton>
      }
    >
      <form onSubmit={handleSubmit} className="setup-page__fields">
        {/* Name Fields */}
        <div className="setup-page__field-row">
          <div className="setup-page__field">
            <div className="setup-page__field-label">
              <label htmlFor="setup-firstname">First name</label>
            </div>
            <input
              id="setup-firstname"
              className="setup-page__input"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>

          <div className="setup-page__field">
            <div className="setup-page__field-label">
              <label htmlFor="setup-lastname">Last name</label>
            </div>
            <input
              id="setup-lastname"
              className="setup-page__input"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Phone Field */}
        <div className="setup-page__field">
          <div className="setup-page__field-label">
            <label htmlFor="setup-phone">Phone number</label>
            <p className="setup-page__field-desc">
              For rent reminders and payment confirmations.
            </p>
          </div>
          <input
            id="setup-phone"
            className="setup-page__input"
            type="tel"
            placeholder="+2348030000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
          />
          <p className="setup-page__hint">Use international format (e.g. +2348030000000)</p>
        </div>

        {/* Date of Birth Field */}
        <div className="setup-page__field">
          <div className="setup-page__field-label">
            <label htmlFor="setup-dob">Date of birth</label>
            <p className="setup-page__field-desc">
              Helps build your Upward profile and credibility score.
            </p>
          </div>
          <DatePicker
            id="setup-dob"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            required
          />
        </div>
      </form>

      <div className="setup-page__notice">
        <span aria-hidden="true">🔒</span>
        <div>We only use these details for account alerts and your rent profile.</div>
      </div>
    </SetupPageShell>
  )
}
