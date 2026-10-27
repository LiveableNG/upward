import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft, KeyRound, Lock, MessageSquare, Power } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { PasswordInput } from '@/components/input/PasswordInput'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { SettingsRow } from '@/features/account/components/SettingsRow'
import { BiometricUnlockRow } from '@/features/auth/components/BiometricUnlockRow'
import { useAuth } from '@/features/auth/AuthProvider'
import { hasAppPin } from '@/features/auth/security/pinService'
import { changePassword, submitFeedback } from '@/features/auth/services/authService'
import { getUserDisplayName } from '@/features/auth/session'
import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { getErrorMessage } from '@/lib/errors'
import { isPasswordStrong } from '@/lib/password'
import { useAppTheme } from '@/theme'

export function SettingsScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const { user, promptPinSetup } = useAuth()
  const [hasPin, setHasPin] = useState(false)
  const { colors, spacing } = useAppTheme()

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) {
      setHasPin(false)
      return
    }
    void hasAppPin(user.email).then(setHasPin)
  }, [user?.email])

  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ current, new: newPassword, confirm }),
    onSuccess: () => {
      setSuccess('Password updated successfully.')
      setPasswordOpen(false)
      setCurrent('')
      setNewPassword('')
      setConfirm('')
      setError(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const feedbackMutation = useMutation({
    mutationFn: () =>
      submitFeedback({
        userId: user!.id,
        email: user!.email,
        name: getUserDisplayName(user),
        type: 'SUGGESTION',
        message: feedbackMessage.trim(),
      }),
    onSuccess: () => {
      setSuccess('Thank you — your feedback was sent.')
      setFeedbackOpen(false)
      setFeedbackMessage('')
      setError(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <Screen scroll background="shell" avoidKeyboard>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Account</EyebrowText>
      <TitleText>Settings</TitleText>
      <BodyText color="textSecondary">Security, feedback, and account preferences.</BodyText>

      {success ? (
        <CaptionText color="clay" style={{ textAlign: 'center' }}>
          {success}
        </CaptionText>
      ) : null}
      {error ? <CaptionText color="error">{error}</CaptionText> : null}

      <Card style={{ paddingVertical: spacing[2], paddingHorizontal: 0 }}>
        <SettingsRow
          icon={<KeyRound size={18} color={colors.clay} />}
          title={hasPin ? 'Change app PIN' : 'Set up app PIN'}
          description="4-digit PIN to unlock the app"
          onPress={promptPinSetup}
        />
        <BiometricUnlockRow onPromptPinSetup={promptPinSetup} />
        <SettingsRow
          icon={<Lock size={18} color={colors.clay} />}
          title="Change password"
          description="Update your login password"
          onPress={() => {
            setPasswordOpen((v) => !v)
            setFeedbackOpen(false)
            setError(null)
          }}
        />
        <SettingsRow
          icon={<MessageSquare size={18} color={colors.clay} />}
          title="Send feedback"
          description="Suggestions and bug reports"
          onPress={() => {
            setFeedbackOpen((v) => !v)
            setPasswordOpen(false)
            setError(null)
          }}
        />
        <SettingsRow
          icon={<Power size={18} color={colors.error} />}
          title="Close account"
          description="Permanently delete your account"
          onPress={() => go('/dashboard/settings/close-account')}
          destructive
        />
      </Card>

      {passwordOpen ? (
        <Card style={{ gap: spacing[3] }}>
          <PasswordInput label="Current password" value={current} onChangeText={setCurrent} />
          <PasswordInput label="New password" value={newPassword} onChangeText={setNewPassword} />
          <PasswordInput label="Confirm password" value={confirm} onChangeText={setConfirm} />
          <Button
            fullWidth
            loading={passwordMutation.isPending}
            onPress={() => {
              setError(null)
              setSuccess(null)
              if (newPassword !== confirm) {
                setError('New passwords do not match.')
                return
              }
              if (!isPasswordStrong(newPassword)) {
                setError('Use at least 8 characters with upper, lower, and a number.')
                return
              }
              passwordMutation.mutate()
            }}
          >
            Save password
          </Button>
        </Card>
      ) : null}

      {feedbackOpen ? (
        <Card style={{ gap: spacing[3] }}>
          <Input
            label="Your message"
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            placeholder="Tell us what we can improve…"
          />
          <Button
            fullWidth
            loading={feedbackMutation.isPending}
            onPress={() => {
              setError(null)
              setSuccess(null)
              if (feedbackMessage.trim().length < 5) {
                setError('Please enter a short message.')
                return
              }
              feedbackMutation.mutate()
            }}
          >
            Submit feedback
          </Button>
        </Card>
      ) : null}
    </Screen>
  )
}
