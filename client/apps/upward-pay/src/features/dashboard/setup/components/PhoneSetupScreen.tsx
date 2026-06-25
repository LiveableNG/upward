'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { getMe } from '@/features/auth/services/authService'
import { useToast } from '@/components/common/Toast'
import { DatePicker } from '@/features/auth/component/signup/DatePicker'
import {
  getIdentityVerificationPath,
  hasDateOfBirth,
  needsIdentityVerification,
  PHONE_REGEX,
} from '@/features/dashboard/utils/profileCompletion'
import { SETUP_PATHS } from '../setupPaths'
import { submitContactDetails, submitPhone } from '../submitRental'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'

function getPageCopy(showDobField: boolean) {
  return {
    title: 'Personal details',
    saveLabel: showDobField ? 'Save details' : 'Save phone number',
    successMessage: showDobField
      ? 'Your personal details have been saved.'
      : 'Your phone number has been saved.',
  }
}

export function PhoneSetupScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState(user?.phone || '')
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '')

  const showDobField = !hasDateOfBirth(user)
  const copy = getPageCopy(showDobField)

  const submitMutation = useMutation({
    mutationFn: async () => {
      const trimmed = phone.trim()
      if (!PHONE_REGEX.test(trimmed)) {
        throw new Error('Enter a valid phone number in +234XXXXXXXXXX format.')
      }
      if (showDobField && !dateOfBirth) {
        throw new Error('Please enter your date of birth.')
      }

      const phoneChanged = !user?.phone || user.phone !== trimmed
      const dobToSave = user?.dateOfBirth || dateOfBirth
      const dobChanged = showDobField && (!user?.dateOfBirth || user.dateOfBirth !== dateOfBirth)

      if (phoneChanged && !showDobField) {
        await submitPhone(trimmed)
      } else if (phoneChanged || dobChanged) {
        await submitContactDetails(trimmed, dobToSave)
      }
    },
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      toast.success(copy.successMessage, 'Saved')
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
    if (!PHONE_REGEX.test(phone.trim())) {
      toast.error('Enter a valid phone number in +234XXXXXXXXXX format.', 'Invalid Phone')
      return
    }
    if (showDobField && !dateOfBirth) {
      toast.error('Please enter your date of birth.', 'Date of birth required')
      return
    }
    submitMutation.mutate()
  }

  return (
    <SetupPageShell
      title={copy.title}
      onBack={() => router.push(SETUP_PATHS.dashboard)}
      footer={
        <SetupPrimaryButton onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Saving…' : copy.saveLabel}
          {!submitMutation.isPending && <ArrowRight size={18} aria-hidden />}
        </SetupPrimaryButton>
      }
    >
      <form onSubmit={handleSubmit} className="setup-page__fields">
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

        {showDobField && (
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
        )}
      </form>

      <div className="setup-page__notice">
        <span aria-hidden="true">🔒</span>
        <div>We only use these details for account alerts and your rent profile.</div>
      </div>
    </SetupPageShell>
  )
}
