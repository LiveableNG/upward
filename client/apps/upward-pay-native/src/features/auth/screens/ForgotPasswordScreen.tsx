import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { AuthShell } from '@/components/auth/AuthShell'
import { OtpInput } from '@/components/auth/OtpInput'
import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { forgotPassword, resetPassword, verifyResetOtp } from '@/features/auth/services/authService'
import { getErrorMessage } from '@/lib/errors'
import { isValidEmail } from '@/lib/validation'
import { useAppTheme } from '@/theme'

type Step = 'email' | 'otp' | 'password' | 'done'

export function ForgotPasswordScreen() {
  const router = useRouter()
  const { spacing } = useAppTheme()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const forgotMutation = useMutation({
    mutationFn: () => forgotPassword(email.trim().toLowerCase()),
    onSuccess: () => {
      setError(null)
      setStep('otp')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const verifyMutation = useMutation({
    mutationFn: (code: string) => {
      setOtp(code)
      return verifyResetOtp(email.trim().toLowerCase(), code)
    },
    onSuccess: () => {
      setError(null)
      setStep('password')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const resetMutation = useMutation({
    mutationFn: () =>
      resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        new: password,
      }),
    onSuccess: () => {
      setError(null)
      setStep('done')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const loading = forgotMutation.isPending || verifyMutation.isPending || resetMutation.isPending

  return (
    <AuthShell onBack={() => router.back()}>
      <View style={{ flex: 1, gap: spacing[5] }}>
        {step === 'email' ? (
          <>
            <View style={{ gap: 8 }}>
              <TitleText>Reset password</TitleText>
              <BodyText color="textSecondary">
                Enter the email on your account and we&apos;ll send a reset code.
              </BodyText>
            </View>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            {error ? <CaptionText color="error">{error}</CaptionText> : null}
            <Button
              fullWidth
              size="pay"
              loading={loading}
              disabled={!isValidEmail(email)}
              onPress={() => forgotMutation.mutate()}
            >
              Send reset code
            </Button>
          </>
        ) : null}

        {step === 'otp' ? (
          <OtpInput
            destination={email}
            loading={loading}
            error={error}
            onVerify={async (code) => {
              await verifyMutation.mutateAsync(code)
            }}
            onResend={async () => {
              await forgotMutation.mutateAsync()
              return
            }}
            onChangeDestination={() => setStep('email')}
          />
        ) : null}

        {step === 'password' ? (
          <>
            <View style={{ gap: 8 }}>
              <TitleText>Create new password</TitleText>
              <BodyText color="textSecondary">
                Choose a strong password with at least 8 characters.
              </BodyText>
            </View>
            <PasswordInput
              label="New password"
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
            />
            {error ? <CaptionText color="error">{error}</CaptionText> : null}
            <Button
              fullWidth
              size="pay"
              loading={loading}
              disabled={password.length < 8}
              onPress={() => resetMutation.mutate()}
            >
              Update password
            </Button>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <View style={{ gap: 8 }}>
              <TitleText>Password updated</TitleText>
              <BodyText color="textSecondary">You can now sign in with your new password.</BodyText>
            </View>
            <Button fullWidth size="pay" onPress={() => router.replace('/login')}>
              Back to login
            </Button>
          </>
        ) : null}
      </View>
    </AuthShell>
  )
}
