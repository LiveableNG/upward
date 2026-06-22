'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { PHONE_REGEX } from '@/features/dashboard/utils/profileCompletion'
import { SETUP_PATHS } from '../setupPaths'
import { submitPhone } from '../submitRental'
import { SetupPageShell, SetupPrimaryButton } from './SetupPageShell'

export function PhoneSetupScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState(user?.phone || '')

  const submitMutation = useMutation({
    mutationFn: async () => {
      const trimmed = phone.trim()
      if (!PHONE_REGEX.test(trimmed)) {
        throw new Error('Enter a valid phone number in +234XXXXXXXXXX format.')
      }
      if (!user?.phone || user.phone !== trimmed) {
        await submitPhone(trimmed)
      }
    },
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['score-profile'] })
      toast.success('Your phone number has been saved.', 'Saved')
      router.push(SETUP_PATHS.dashboard)
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
    submitMutation.mutate()
  }

  return (
    <SetupPageShell
      onBack={() => router.push(SETUP_PATHS.dashboard)}
      footer={
        <SetupPrimaryButton onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? 'Saving…' : 'Save phone number'}
          {!submitMutation.isPending && <ArrowRight size={18} aria-hidden />}
        </SetupPrimaryButton>
      }
    >
      <h2 className="setup-page__title">Add your phone number</h2>
      <p className="setup-page__subtitle">
        Get rent reminders and payment confirmations sent straight to your phone.
      </p>

      <form onSubmit={handleSubmit} className="setup-page__fields">
        <div className="setup-page__field">
          <label>Phone number</label>
          <input
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
      </form>

      <div className="setup-page__notice">
        <span aria-hidden="true">🔒</span>
        <div>We only use your number for account alerts and rent reminders.</div>
      </div>
    </SetupPageShell>
  )
}
