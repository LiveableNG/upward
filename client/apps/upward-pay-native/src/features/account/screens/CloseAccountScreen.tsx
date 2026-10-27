import { useRouter } from 'expo-router'
import { AlertTriangle, ChevronLeft } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import { OtpInput } from '@/components/auth/OtpInput'
import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { CheckboxField } from '@/components/form/CheckboxField'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { deleteAccount, requestDeleteAccountOtp } from '@/features/auth/services/authService'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Step = 'OVERVIEW' | 'REASON' | 'CONFIRM' | 'OTP' | 'DELETED'

const REASONS = [
  'I have another Upward account',
  "Don't need an Upward account / No longer renting",
  'My landlord or agent does not support Upward',
  'Got a new mobile number or email address',
  'Poor customer service or technical issues',
  'Switching platforms',
  'Worried about account privacy or security',
  'Prefer not to say',
]

export function CloseAccountScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { colors, spacing, radius } = useAppTheme()

  const [step, setStep] = useState<Step>('OVERVIEW')
  const [selectedReason, setSelectedReason] = useState(REASONS[REASONS.length - 1])
  const [chk1, setChk1] = useState(false)
  const [chk2, setChk2] = useState(false)
  const [chk3, setChk3] = useState(false)
  const [emailMasked, setEmailMasked] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const allChecked = chk1 && chk2 && chk3

  useEffect(() => {
    if (step !== 'OTP' || cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [step, cooldown])

  useEffect(() => {
    if (step !== 'DELETED') return
    const id = setTimeout(async () => {
      await signOut()
      router.replace('/welcome')
    }, 3500)
    return () => clearTimeout(id)
  }, [step, signOut, router])

  const handleBack = () => {
    if (step === 'OVERVIEW') router.back()
    else if (step === 'REASON') setStep('OVERVIEW')
    else if (step === 'CONFIRM') setStep('REASON')
    else if (step === 'OTP') setStep('CONFIRM')
  }

  const proceedToOtp = async () => {
    setRequestingOtp(true)
    setOtpError(null)
    try {
      const res = await requestDeleteAccountOtp()
      setEmailMasked(res.emailMasked || user?.email || 'your email')
      setCooldown(res.cooldownSeconds ?? 60)
      setStep('OTP')
    } catch (err) {
      setOtpError(getErrorMessage(err))
    } finally {
      setRequestingOtp(false)
    }
  }

  const resendOtp = async () => {
    if (cooldown > 0 || requestingOtp) return
    setRequestingOtp(true)
    setOtpError(null)
    try {
      const res = await requestDeleteAccountOtp()
      setCooldown(res.cooldownSeconds ?? 60)
    } catch (err) {
      setOtpError(getErrorMessage(err))
    } finally {
      setRequestingOtp(false)
    }
  }

  const confirmDelete = async (otp: string) => {
    setDeleting(true)
    setOtpError(null)
    try {
      await deleteAccount({ otp, reason: selectedReason })
      setStep('DELETED')
    } catch (err) {
      setOtpError(getErrorMessage(err))
      throw err
    } finally {
      setDeleting(false)
    }
  }

  if (!user) return null

  return (
    <Screen scroll background="shell">
      {step !== 'DELETED' ? (
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
        >
          <ChevronLeft size={22} color={colors.textSecondary} />
          <BodyText color="textSecondary">Back</BodyText>
        </Pressable>
      ) : null}

      {step === 'DELETED' ? (
        <View style={{ gap: spacing[4], paddingTop: spacing[8], alignItems: 'center' }}>
          <TitleText>Account deleted</TitleText>
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Your Upward account has been permanently removed. Redirecting…
          </BodyText>
        </View>
      ) : (
        <>
          <EyebrowText color="error">Account</EyebrowText>
          <TitleText>Close account</TitleText>

          {step === 'OVERVIEW' ? (
            <View style={{ gap: spacing[4] }}>
              <Card
                style={{
                  gap: spacing[3],
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                }}
              >
                <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} color={colors.error} />
                  <BodyText style={{ flex: 1 }}>
                    Closing your account permanently removes your Rent Passport score, payment
                    history, vault savings, and property connections. This cannot be undone.
                  </BodyText>
                </View>
              </Card>
              <Button variant="danger" fullWidth onPress={() => setStep('REASON')}>
                Continue
              </Button>
            </View>
          ) : null}

          {step === 'REASON' ? (
            <View style={{ gap: spacing[3] }}>
              <BodyText color="textSecondary">Tell us why you&apos;re leaving (required).</BodyText>
              {REASONS.map((reason) => {
                const selected = selectedReason === reason
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    style={{
                      padding: spacing[3],
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: selected ? colors.clay : colors.shellBorder,
                      backgroundColor: selected ? colors.shellTint : colors.bg,
                    }}
                  >
                    <BodyText weight={selected ? 'semibold' : undefined}>{reason}</BodyText>
                  </Pressable>
                )
              })}
              <Button fullWidth onPress={() => setStep('CONFIRM')}>
                Next
              </Button>
            </View>
          ) : null}

          {step === 'CONFIRM' ? (
            <View style={{ gap: spacing[4] }}>
              <BodyText color="textSecondary">Confirm you understand the consequences.</BodyText>
              <CheckboxField
                checked={chk1}
                onChange={setChk1}
                label="I understand my Rent Passport score and verified history will be deleted."
              />
              <CheckboxField
                checked={chk2}
                onChange={setChk2}
                label="I understand active vault balances and pending payments may block deletion until settled."
              />
              <CheckboxField
                checked={chk3}
                onChange={setChk3}
                label="I want to permanently close this Upward account."
              />
              {otpError ? <CaptionText color="error">{otpError}</CaptionText> : null}
              <Button
                fullWidth
                disabled={!allChecked}
                loading={requestingOtp}
                onPress={() => void proceedToOtp()}
              >
                Send verification code
              </Button>
            </View>
          ) : null}

          {step === 'OTP' ? (
            <View style={{ gap: spacing[4] }}>
              <BodyText color="textSecondary">
                Enter the 6-digit code sent to {emailMasked || 'your email'}.
              </BodyText>
              <OtpInput
                destination={emailMasked || user.email}
                loading={deleting || requestingOtp}
                error={otpError}
                onVerify={confirmDelete}
                onResend={async () => {
                  if (cooldown > 0) return
                  await resendOtp()
                }}
              />
              {cooldown > 0 ? (
                <CaptionText color="textMuted" style={{ textAlign: 'center' }}>
                  Resend available in {cooldown}s
                </CaptionText>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  )
}
