import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { AlertCircle } from 'lucide-react-native'

import { AuthShell } from '@/components/auth/AuthShell'
import { OtpInput } from '@/components/auth/OtpInput'
import { Button } from '@/components/button/Button'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { BodyText, CaptionText, LabelText, TitleText } from '@/components/text'
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { useAuth } from '@/features/auth/AuthProvider'
import { getPostAuthSetupPath, needsProfileSetup } from '@/features/auth/session'
import { checkEmail, login, loginWithOTP, requestOTP } from '@/features/auth/services/authService'
import { getErrorMessage } from '@/lib/errors'
import { isValidEmail, normalizePhone } from '@/lib/validation'
import { useAppTheme } from '@/theme'

type LoginMethod = 'password' | 'code' | null
type IdentifierType = 'email' | 'phone'
type IdentifierCheckState = 'idle' | 'checking' | 'found' | 'missing' | 'failed'

export function LoginScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const { colors, spacing } = useAppTheme()
  const params = useLocalSearchParams<{ email?: string; redirect?: string }>()
  const initialEmail = typeof params.email === 'string' ? params.email : ''
  const redirectPath =
    typeof params.redirect === 'string' && params.redirect.startsWith('/') ? params.redirect : null

  const afterLoginPath = (user: Parameters<typeof needsProfileSetup>[0]) => {
    if (redirectPath) return redirectPath
    return needsProfileSetup(user) ? getPostAuthSetupPath(user) : '/dashboard'
  }

  const [identifierType, setIdentifierType] = useState<IdentifierType>('email')
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(null)
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [phoneChannel, setPhoneChannel] = useState<'SMS' | 'WHATSAPP'>('SMS')
  const [emailExists, setEmailExists] = useState(false)
  const [identifierCheck, setIdentifierCheck] = useState<IdentifierCheckState>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const identifier = identifierType === 'phone' ? normalizePhone(phone) : email.trim().toLowerCase()

  useEffect(() => {
    setEmailExists(false)
    setIdentifierCheck('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const ready =
      identifierType === 'email' ? isValidEmail(email) : phone.replace(/\D/g, '').length >= 10

    if (!ready) {
      return
    }

    setIdentifierCheck('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkEmail(identifier, identifierType)
        setEmailExists(res.exists)
        setIdentifierCheck(res.exists ? 'found' : 'missing')
      } catch {
        setEmailExists(false)
        setIdentifierCheck('failed')
      }
    }, 700)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [email, phone, identifierType, identifier])

  const passwordMutation = useMutation({
    mutationFn: (override?: { email: string; password: string; type?: IdentifierType }) =>
      login({
        email: override?.email ?? identifier,
        password: override?.password ?? password,
        type: override?.type ?? identifierType,
      }),
    onSuccess: async (result) => {
      await signIn(
        { accessToken: result.accessToken, refreshToken: result.refreshToken },
        result.user,
      )
      router.replace(afterLoginPath(result.user) as '/dashboard')
    },
    onError: (error) => setFormError(getErrorMessage(error, 'Invalid credentials')),
  })

  const otpLoginMutation = useMutation({
    mutationFn: (otp: string) => loginWithOTP(identifier, otp, identifierType),
    onSuccess: async (result) => {
      await signIn(
        { accessToken: result.accessToken, refreshToken: result.refreshToken },
        result.user,
      )
      router.replace(afterLoginPath(result.user) as '/dashboard')
    },
    onError: (error) => setOtpError(getErrorMessage(error, 'Invalid verification code')),
  })

  const requestOtpMutation = useMutation({
    mutationFn: () => requestOTP(identifier, 'LOGIN', identifierType, phoneChannel),
    onSuccess: () => {
      setStep('otp')
      setOtpError(null)
    },
    onError: (error) => setFormError(getErrorMessage(error, 'Failed to send code')),
  })

  const loading =
    passwordMutation.isPending || otpLoginMutation.isPending || requestOtpMutation.isPending

  const handleContinue = async () => {
    setFormError(null)
    if (identifierType === 'email' && !isValidEmail(email)) {
      setFormError('Enter a valid email address.')
      return
    }
    if (loginMethod === 'password') {
      passwordMutation.mutate(undefined)
      return
    }
    if (loginMethod === 'code') {
      requestOtpMutation.mutate()
    }
  }

  if (step === 'otp') {
    return (
      <AuthShell onBack={() => setStep('login')}>
        <OtpInput
          destination={identifier}
          loading={loading}
          error={otpError}
          onVerify={async (otp) => {
            setOtpError(null)
            await otpLoginMutation.mutateAsync(otp)
          }}
          onResend={async () => {
            await requestOtpMutation.mutateAsync()
            return
          }}
          onChangeDestination={() => setStep('login')}
        />
      </AuthShell>
    )
  }

  const canTryPassword =
    loginMethod === 'password' && !!password && (emailExists || identifierCheck === 'failed')
  const canContinueCode = emailExists && loginMethod === 'code'

  return (
    <AuthShell onBack={() => router.replace('/welcome')}>
      <View style={{ flex: 1, gap: spacing[5] }}>
        <View style={{ gap: 8 }}>
          <TitleText>Welcome back</TitleText>
          <BodyText color="textSecondary">
            Sign in with your password or a one-time verification code.
          </BodyText>
        </View>

        <View style={{ gap: spacing[4] }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <LabelText color="textSecondary">
              {identifierType === 'email' ? 'Email address' : 'Phone number'}
            </LabelText>
            <Pressable
              onPress={() => {
                setIdentifierType(identifierType === 'email' ? 'phone' : 'email')
                setEmailExists(false)
                setLoginMethod(null)
              }}
            >
              <LabelText color="clay">
                Use {identifierType === 'email' ? 'phone' : 'email'}
              </LabelText>
            </Pressable>
          </View>

          {identifierType === 'email' ? (
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          ) : (
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="800 000 0000"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          )}

          {identifierCheck === 'checking' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.clay} />
              <CaptionText color="textMuted">Checking account…</CaptionText>
            </View>
          ) : null}

          {identifierCheck === 'failed' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <AlertCircle size={14} color={colors.error} />
              <CaptionText color="error">
                Couldn&apos;t reach the server. Start the API or set EXPO_PUBLIC_API_URL, then try
                again — you can still attempt password sign-in.
              </CaptionText>
            </View>
          ) : null}

          {identifierCheck === 'missing' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <AlertCircle size={14} color={colors.error} />
              <CaptionText color="error">Account not found.</CaptionText>
              <Pressable onPress={() => router.push({ pathname: '/signup', params: { email } })}>
                <CaptionText color="clay">Sign up instead?</CaptionText>
              </Pressable>
            </View>
          ) : null}

          {emailExists || identifierCheck === 'failed' ? (
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Button
                variant={loginMethod === 'password' ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setLoginMethod('password')}
              >
                Password
              </Button>
              {emailExists ? (
                <Button
                  variant={loginMethod === 'code' ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setLoginMethod('code')}
                >
                  OTP code
                </Button>
              ) : null}
            </View>
          ) : null}

          {loginMethod === 'password' ? (
            <PasswordInput value={password} onChangeText={setPassword} />
          ) : null}

          {loginMethod === 'code' && identifierType === 'phone' ? (
            <View style={{ flexDirection: 'row', gap: spacing[4] }}>
              {(['SMS', 'WHATSAPP'] as const).map((channel) => (
                <Pressable key={channel} onPress={() => setPhoneChannel(channel)}>
                  <LabelText color={phoneChannel === channel ? 'clay' : 'textSecondary'}>
                    {channel === 'SMS' ? 'SMS' : 'WhatsApp'}
                  </LabelText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {formError ? <CaptionText color="error">{formError}</CaptionText> : null}
        </View>

        <View style={{ marginTop: 'auto', gap: spacing[3] }}>
          <Button
            fullWidth
            size="pay"
            loading={loading}
            disabled={!(canTryPassword || canContinueCode)}
            onPress={() => void handleContinue()}
          >
            Continue
          </Button>
          <Pressable onPress={() => router.push('/forgot-password')}>
            <BodyText align="center" color="clay">
              Forgot password?
            </BodyText>
          </Pressable>
          <BiometricLoginButton
            disabled={loading}
            onError={(message) => setFormError(message)}
            onAuthenticated={(email, password) => {
              setFormError(null)
              passwordMutation.mutate({ email, password, type: 'email' })
            }}
          />
          <SocialAuthButtons disabled={loading} redirectPath={redirectPath} />
        </View>
      </View>
    </AuthShell>
  )
}
