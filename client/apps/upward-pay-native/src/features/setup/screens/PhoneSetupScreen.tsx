import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { getMe, updateProfile } from '@/features/auth/services/authService'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import {
  cleanInternationalPhone,
  hasRentalInfo,
  PHONE_REGEX,
} from '@/features/setup/profileCompletion'
import { SETUP_PATHS } from '@/features/setup/setupPaths'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parts = value.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function PhoneSetupScreen() {
  const router = useRouter()
  const { goToHome } = useDashboardNavigation()
  const { user, refreshUser } = useAuth()
  const { spacing } = useAppTheme()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
  )
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.firstName && !firstName) setFirstName(user.firstName)
    if (user.lastName && !lastName) setLastName(user.lastName)
    if (user.phone && !phone) setPhone(user.phone)
    if (user.dateOfBirth && !dateOfBirth) setDateOfBirth(user.dateOfBirth.split('T')[0])
  }, [user])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleaned = cleanInternationalPhone(phone)
      if (!PHONE_REGEX.test(cleaned)) {
        throw new Error('Enter a valid phone number in international format (e.g. +2348030000000).')
      }
      if (!dateOfBirth) {
        throw new Error('Please enter your date of birth.')
      }
      if (!isValidDateInput(dateOfBirth)) {
        throw new Error('Date of birth must be YYYY-MM-DD.')
      }
      const dobDate = new Date(dateOfBirth)
      if (Number.isNaN(dobDate.getTime()) || dobDate > new Date()) {
        throw new Error('Date of birth cannot be in the future.')
      }

      await updateProfile({
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        phone: cleaned,
        dateOfBirth,
      })
    },
    onSuccess: async () => {
      await refreshUser()
      const freshUser = await getMe()
      if (!hasRentalInfo(freshUser)) router.replace(SETUP_PATHS.rental)
      else goToHome()
    },
    onError: (err) => {
      setFormError(getErrorMessage(err))
    },
  })

  return (
    <SetupPageShell
      title="Personal details"
      subtitle="Complete your profile to build credibility and secure your account."
      onBack={goToHome}
      footer={
        <Button
          fullWidth
          loading={saveMutation.isPending}
          onPress={() => {
            setFormError(null)
            saveMutation.mutate()
          }}
        >
          Save details
        </Button>
      }
    >
      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        <View style={{ flex: 1 }}>
          <Input
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
          />
        </View>
      </View>

      <Input
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        placeholder="+2348030000000"
        keyboardType="phone-pad"
        autoComplete="tel"
        hint={
          <CaptionText color="textMuted">For rent reminders and payment confirmations.</CaptionText>
        }
      />

      <Input
        label="Date of birth"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="1990-01-15"
        autoComplete="birthdate-full"
        hint={<CaptionText color="textMuted">Format: YYYY-MM-DD</CaptionText>}
      />

      {formError ? <CaptionText color="error">{formError}</CaptionText> : null}

      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          padding: spacing[4],
          borderRadius: 12,
          backgroundColor: 'rgba(0,0,0,0.03)',
        }}
      >
        <BodyText>🔒</BodyText>
        <View style={{ flex: 1 }}>
          <BodyText color="textSecondary">
            We only use these details for account alerts and your rent profile.
          </BodyText>
        </View>
      </View>
    </SetupPageShell>
  )
}
