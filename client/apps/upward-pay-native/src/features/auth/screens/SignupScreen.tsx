import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native'
import { AlertCircle, Sparkles } from 'lucide-react-native'

import { AuthShell } from '@/components/auth/AuthShell'
import { ExistsAccountModal } from '@/components/auth/ExistsAccountModal'
import { OtpInput } from '@/components/auth/OtpInput'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { Button } from '@/components/button/Button'
import { CheckboxField } from '@/components/form/CheckboxField'
import { HearAboutSelect } from '@/components/form/HearAboutSelect'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { PhoneInput } from '@/components/input/PhoneInput'
import { BodyText, CaptionText, LabelText, TitleText } from '@/components/text'
import { HEAR_ABOUT_US_OPTIONS, type HearAboutUsId } from '@/features/auth/constants'
import { useSignup } from '@/features/auth/hooks/useSignup'
import { getPostAuthSetupPath, needsProfileSetup } from '@/features/auth/session'
import {
  checkEmail,
  loginWithOTP,
  requestOTP,
  verifyOTP,
} from '@/features/auth/services/authService'
import { SocialAuthButtons } from '@/features/auth/components/SocialAuthButtons'
import { useAuth } from '@/features/auth/AuthProvider'
import { getErrorMessage } from '@/lib/errors'
import { isPasswordStrong } from '@/lib/password'
import { isValidEmail, normalizePhone } from '@/lib/validation'
import { useAppTheme } from '@/theme'

type OtpContext = 'SIGNUP' | 'LOGIN' | 'INVITE' | 'WAITLIST'
type IdentifierType = 'email' | 'phone'
type Step = 'form' | 'otp'

const WEB_BASE = 'https://upward.goodtenants.io'

function resolveHearAboutUs(id: HearAboutUsId | '', other: string): string | undefined {
  if (!id) return undefined
  if (id === 'other') {
    const trimmed = other.trim()
    return trimmed ? `Other: ${trimmed}` : 'Other'
  }
  return HEAR_ABOUT_US_OPTIONS.find((o) => o.id === id)?.label
}

export function SignupScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const { colors, spacing } = useAppTheme()
  const params = useLocalSearchParams<{ email?: string }>()
  const initialRaw = typeof params.email === 'string' ? params.email : ''

  const [step, setStep] = useState<Step>('form')
  const [identifierType, setIdentifierType] = useState<IdentifierType>(
    initialRaw.startsWith('+') || /^\d+$/.test(initialRaw) ? 'phone' : 'email',
  )
  const [email, setEmail] = useState(identifierType === 'email' && initialRaw ? initialRaw : '')
  const [phone, setPhone] = useState(
    identifierType === 'phone' ? initialRaw.replace(/^\+234/, '') : '',
  )
  const [phoneChannel, setPhoneChannel] = useState<'SMS' | 'WHATSAPP'>('SMS')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [hearAboutUs, setHearAboutUs] = useState<HearAboutUsId | ''>('')
  const [hearAboutUsOther, setHearAboutUsOther] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [effectiveContext, setEffectiveContext] = useState<OtpContext>('SIGNUP')
  const [emailExists, setEmailExists] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [isWaitlist, setIsWaitlist] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [showExistsModal, setShowExistsModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const identifier = identifierType === 'phone' ? normalizePhone(phone) : email.trim().toLowerCase()

  const signupMutation = useSignup()

  const requestOtpMutation = useMutation({
    mutationFn: (context: OtpContext) =>
      requestOTP(identifier, context, identifierType, phoneChannel),
    onSuccess: (_data, context) => {
      setEffectiveContext(context)
      setStep('otp')
      setLocalError(null)
    },
    onError: (err) => setLocalError(getErrorMessage(err, 'Failed to send verification code')),
  })

  useEffect(() => {
    setEmailExists(false)
    setIsInvited(false)
    setIsWaitlist(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const ready =
      identifierType === 'email' ? isValidEmail(email) : phone.replace(/\D/g, '').length >= 10
    if (!ready) {
      setCheckingEmail(false)
      return
    }

    setCheckingEmail(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkEmail(identifier, identifierType)
        setEmailExists(res.exists)
        setIsInvited(res.isInvited ?? false)
        setIsWaitlist(res.isWaitlist ?? false)
      } catch {
        setEmailExists(false)
      } finally {
        setCheckingEmail(false)
      }
    }, 700)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [email, phone, identifierType, identifier])

  const loading = signupMutation.isPending || requestOtpMutation.isPending

  const canSubmitForm =
    (identifierType === 'email' ? isValidEmail(email) : phone.replace(/\D/g, '').length >= 10) &&
    !checkingEmail &&
    !emailExists &&
    !!firstName.trim() &&
    !!lastName.trim() &&
    isPasswordStrong(password) &&
    confirmPassword === password &&
    termsAgreed

  const submitSignupForm = () => {
    setLocalError(null)
    if (identifierType === 'email' && !isValidEmail(email)) {
      setLocalError('Enter a valid email address.')
      return
    }
    if (emailExists && !isInvited && !isWaitlist) {
      setShowExistsModal(true)
      return
    }
    if (emailExists && isInvited) {
      requestOtpMutation.mutate('INVITE')
      return
    }
    if (emailExists && isWaitlist) {
      requestOtpMutation.mutate('WAITLIST')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    requestOtpMutation.mutate('SIGNUP')
  }

  const completeSignup = () => {
    const hearAboutUsValue = resolveHearAboutUs(hearAboutUs, hearAboutUsOther)
    if (identifierType === 'phone') {
      const generatedEmail = `${identifier.replace('+', '')}@upward.com`
      signupMutation.mutate({
        email: generatedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: identifier,
        hearAboutUs: hearAboutUsValue,
      })
      return
    }
    signupMutation.mutate({
      email: identifier,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      hearAboutUs: hearAboutUsValue,
    })
  }

  const handleVerifyOtp = async (otp: string) => {
    setOtpError(null)
    try {
      if (effectiveContext === 'LOGIN') {
        const result = await loginWithOTP(identifier, otp, identifierType)
        await signIn(
          { accessToken: result.accessToken, refreshToken: result.refreshToken },
          result.user,
        )
        router.replace(
          needsProfileSetup(result.user) ? getPostAuthSetupPath(result.user) : '/dashboard',
        )
        return
      }

      const verification = await verifyOTP(identifier, otp, effectiveContext, identifierType)
      if (!verification.success) {
        setOtpError(verification.message || 'Invalid verification code')
        return
      }

      if (effectiveContext === 'WAITLIST' && verification.inviteToken) {
        router.replace(`/waitlist/${verification.inviteToken}`)
        return
      }
      if (effectiveContext === 'INVITE' && verification.inviteToken) {
        router.replace(`/invite/${verification.inviteToken}`)
        return
      }

      completeSignup()
    } catch (err) {
      setOtpError(getErrorMessage(err, 'Verification failed'))
    }
  }

  if (step === 'otp') {
    return (
      <AuthShell onBack={() => setStep('form')}>
        <OtpInput
          destination={identifier}
          loading={loading}
          error={otpError || getErrorMessage(signupMutation.error)}
          onVerify={handleVerifyOtp}
          onResend={async () => {
            await requestOtpMutation.mutateAsync(effectiveContext)
          }}
          onChangeDestination={() => setStep('form')}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell onBack={() => router.replace('/welcome')}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}
        >
          <View style={{ gap: 8 }}>
            <TitleText>Create your account</TitleText>
            <BodyText color="textSecondary">
              Name, email, and password — takes under a minute.
            </BodyText>
          </View>

          {localError || signupMutation.error ? (
            <CaptionText color="error">
              {localError || getErrorMessage(signupMutation.error)}
            </CaptionText>
          ) : null}

          <View style={{ gap: spacing[3] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <LabelText color="textSecondary">
                {identifierType === 'email' ? 'Email address' : 'Phone number'}
              </LabelText>
              <Pressable
                onPress={() => {
                  setIdentifierType(identifierType === 'email' ? 'phone' : 'email')
                  setEmailExists(false)
                }}
              >
                <LabelText color="clay">
                  Sign up with {identifierType === 'email' ? 'phone' : 'email'}
                </LabelText>
              </Pressable>
            </View>

            {identifierType === 'email' ? (
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="sarah@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            ) : (
              <>
                <PhoneInput value={phone} onChangeText={setPhone} label="" />
                <View style={{ flexDirection: 'row', gap: spacing[4] }}>
                  {(['SMS', 'WHATSAPP'] as const).map((channel) => (
                    <Pressable key={channel} onPress={() => setPhoneChannel(channel)}>
                      <LabelText color={phoneChannel === channel ? 'clay' : 'textSecondary'}>
                        {channel === 'SMS' ? 'SMS' : 'WhatsApp'}
                      </LabelText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {checkingEmail ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.clay} />
                <CaptionText color="textMuted">Checking account…</CaptionText>
              </View>
            ) : null}

            {emailExists && !isInvited && !isWaitlist ? (
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
              >
                <AlertCircle size={14} color={colors.error} />
                <CaptionText color="error">This email is already registered.</CaptionText>
                <Pressable onPress={() => setShowExistsModal(true)}>
                  <CaptionText color="clay">Log in instead?</CaptionText>
                </Pressable>
              </View>
            ) : null}

            {emailExists && isInvited ? (
              <Pressable onPress={() => requestOtpMutation.mutate('INVITE')}>
                <CaptionText color="clay">
                  Your manager invited you — verify to set your password
                </CaptionText>
              </Pressable>
            ) : null}

            {emailExists && isWaitlist ? (
              <Pressable onPress={() => requestOtpMutation.mutate('WAITLIST')}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Sparkles size={14} color={colors.clay} />
                  <CaptionText color="clay">
                    You have priority access — claim your account
                  </CaptionText>
                </View>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Input
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Sarah"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Johnson"
              />
            </View>
          </View>

          <View>
            <PasswordInput
              label="Create password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {password.length > 0 ? <PasswordStrengthMeter password={password} /> : null}
          </View>

          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={
              confirmPassword.length > 0 && confirmPassword !== password
                ? "Passwords don't match"
                : undefined
            }
          />

          <HearAboutSelect
            value={hearAboutUs}
            onChange={setHearAboutUs}
            otherText={hearAboutUsOther}
            onChangeOtherText={setHearAboutUsOther}
          />

          <CheckboxField
            checked={termsAgreed}
            onChange={setTermsAgreed}
            label={
              <CaptionText color="textSecondary">
                I agree to the{' '}
                <CaptionText
                  color="clay"
                  onPress={() => void Linking.openURL(`${WEB_BASE}/legal/terms`)}
                >
                  Terms of Use
                </CaptionText>{' '}
                and{' '}
                <CaptionText
                  color="clay"
                  onPress={() => void Linking.openURL(`${WEB_BASE}/legal/privacy`)}
                >
                  Privacy Policy
                </CaptionText>
                .
              </CaptionText>
            }
          />

          <Button
            fullWidth
            size="pay"
            loading={loading}
            disabled={!canSubmitForm}
            onPress={submitSignupForm}
          >
            {requestOtpMutation.isPending ? 'Sending code…' : 'Create account'}
          </Button>

          <SocialAuthButtons disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ExistsAccountModal
        visible={showExistsModal}
        identifier={identifier}
        onClose={() => setShowExistsModal(false)}
        onLogin={() => {
          setShowExistsModal(false)
          router.push({ pathname: '/login', params: { email: identifier } })
        }}
      />
    </AuthShell>
  )
}
