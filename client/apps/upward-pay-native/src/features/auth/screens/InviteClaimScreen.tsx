import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  acceptInvite,
  fetchInvite,
  isAuthPayload,
} from '@/features/auth/services/onboardingLinksService'
import { getPostAuthSetupPath } from '@/features/auth/session'
import { getErrorMessage } from '@/lib/errors'
import { isPasswordStrong } from '@/lib/password'
import { isValidEmail } from '@/lib/validation'
import { useAppTheme } from '@/theme'

type Props = { token: string }

export function InviteClaimScreen({ token }: Props) {
  const router = useRouter()
  const { signIn } = useAuth()
  const { spacing } = useAppTheme()
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('Your Landlord')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const res = await fetchInvite(token)
        if (cancelled) return
        if (res.isWaitlist) {
          router.replace(`/waitlist/${token}`)
          return
        }
        if (res.hasPassword) {
          router.replace('/login')
          return
        }
        setCompanyName(res.company?.name || 'Your Landlord')
        setFirstName(res.firstName || '')
        setLastName(res.lastName || '')
        setEmail(res.email || '')
      } catch {
        if (!cancelled) {
          setError('Invite not found or has expired.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

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
      const res = await acceptInvite(token, {
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      })
      if (!isAuthPayload(res)) {
        throw new Error('Account activation failed.')
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
            Loading your invitation…
          </CaptionText>
        </View>
      </AuthShell>
    )
  }

  return (
    <AuthShell onBack={() => router.replace('/welcome')}>
      <View style={{ flex: 1, gap: spacing[5] }}>
        <View style={{ gap: 8 }}>
          <TitleText>Join {companyName}</TitleText>
          <BodyText color="textSecondary">
            Verify your details and set a password to activate your Upward account.
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
        <PasswordInput label="Password" value={password} onChangeText={setPassword} />
        <PasswordStrengthMeter password={password} />
        <PasswordInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Button fullWidth loading={submitting} onPress={() => void submit()}>
          Activate account
        </Button>
      </View>
    </AuthShell>
  )
}
