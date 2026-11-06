import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { PhoneInput } from '@/components/input/PhoneInput'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  acceptWaitlistClaim,
  fetchWaitlistClaim,
  isAuthPayload,
} from '@/features/auth/services/onboardingLinksService'
import { getPostAuthSetupPath } from '@/features/auth/session'
import { getErrorMessage } from '@/lib/errors'
import { isPasswordStrong } from '@/lib/password'
import { isValidEmail, normalizePhone } from '@/lib/validation'
import { useAppTheme } from '@/theme'

type Props = { uuid: string }

export function WaitlistClaimScreen({ uuid }: Props) {
  const router = useRouter()
  const { signIn } = useAuth()
  const { spacing } = useAppTheme()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!uuid) {
        setLoading(false)
        return
      }
      try {
        const res = await fetchWaitlistClaim(uuid)
        if (cancelled) return
        if (res.hasPassword) {
          router.replace('/login')
          return
        }
        setFirstName(res.firstName || '')
        setLastName(res.lastName || '')
        setEmail(res.email || '')
        if (res.phone) {
          setPhone(res.phone.replace(/^\+234/, ''))
        }
      } catch {
        if (!cancelled) setError('Waitlist record not found or expired.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uuid, router])

  const submit = async () => {
    setError(null)
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!isPasswordStrong(password)) {
      setError('Choose a stronger password.')
      return
    }
    setSubmitting(true)
    try {
      const res = await acceptWaitlistClaim(uuid, {
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? normalizePhone(phone) : undefined,
      })
      if (!isAuthPayload(res)) {
        throw new Error('Could not create your account.')
      }
      await signIn({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user)
      router.replace(getPostAuthSetupPath(res.user))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthShell onBack={() => router.replace('/welcome')}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <CaptionText color="textSecondary" style={{ marginTop: spacing[3] }}>
            Loading waitlist details…
          </CaptionText>
        </View>
      </AuthShell>
    )
  }

  return (
    <AuthShell onBack={() => router.replace('/welcome')}>
      <View style={{ flex: 1, gap: spacing[5] }}>
        <View style={{ gap: 8 }}>
          <TitleText>Finalize your account</TitleText>
          <BodyText color="textSecondary">
            You&apos;re off the waitlist. Confirm your details and set a password to get started.
          </BodyText>
        </View>

        {error ? <CaptionText color="error">{error}</CaptionText> : null}

        <Input
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <Input
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <PhoneInput label="Phone (optional)" value={phone} onChangeText={setPhone} />
        <PasswordInput label="Password" value={password} onChangeText={setPassword} />
        <PasswordStrengthMeter password={password} />
        <PasswordInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Button fullWidth loading={submitting} onPress={() => void submit()}>
          Create account
        </Button>
      </View>
    </AuthShell>
  )
}
