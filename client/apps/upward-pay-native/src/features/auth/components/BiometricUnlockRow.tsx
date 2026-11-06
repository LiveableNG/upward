import * as LocalAuthentication from 'expo-local-authentication'
import { Fingerprint, Scan } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { PasswordInput } from '@/components/input/PasswordInput'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { SettingsRow } from '@/features/account/components/SettingsRow'
import { useAuth } from '@/features/auth/AuthProvider'
import { login } from '@/features/auth/services/authService'
import {
  authenticateBiometric,
  getBiometryLabel,
  getBiometryTypes,
  isBiometricsAvailable,
  isBiometricsEnabled,
  saveBiometricCredentials,
  setBiometricsEnabled,
} from '@/features/auth/security/biometricsService'
import { hasAppPin } from '@/features/auth/security/pinService'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type BiometricUnlockRowProps = {
  onPromptPinSetup?: () => void
}

export function BiometricUnlockRow({ onPromptPinSetup }: BiometricUnlockRowProps) {
  const { user, promptPinSetup } = useAuth()
  const { colors, spacing, radius } = useAppTheme()
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [bioTypes, setBioTypes] = useState<LocalAuthentication.AuthenticationType[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const bioLabel = getBiometryLabel(bioTypes)
  const isFace =
    bioTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
    bioTypes.includes(LocalAuthentication.AuthenticationType.IRIS)

  useEffect(() => {
    void (async () => {
      const [avail, on, types] = await Promise.all([
        isBiometricsAvailable(),
        isBiometricsEnabled(),
        getBiometryTypes(),
      ])
      setAvailable(avail)
      setEnabled(on)
      setBioTypes(types)
      setLoading(false)
    })()
  }, [])

  const handleToggle = async () => {
    if (processing || !user) return
    if (enabled) {
      setProcessing(true)
      try {
        await setBiometricsEnabled(false)
        setEnabled(false)
      } finally {
        setProcessing(false)
      }
      return
    }

    const pinOk = await hasAppPin(user.email)
    if (!pinOk) {
      onPromptPinSetup?.() ?? promptPinSetup()
      return
    }
    setConfirmOpen(true)
  }

  const enableWithPassword = async () => {
    if (!user?.email || !password.trim()) return
    setProcessing(true)
    setError(null)
    try {
      const ok = await authenticateBiometric('Confirm your identity to enable biometric unlock')
      if (!ok) throw new Error('Biometric verification cancelled')

      await login({ email: user.email, password, type: 'email' })
      await saveBiometricCredentials(user.email, password)
      await setBiometricsEnabled(true)
      setEnabled(true)
      setConfirmOpen(false)
      setPassword('')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not enable biometrics'))
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !available) return null

  return (
    <>
      <SettingsRow
        icon={
          isFace ? (
            <Scan size={18} color={colors.clay} />
          ) : (
            <Fingerprint size={18} color={colors.clay} />
          )
        }
        title={`${bioLabel} unlock`}
        description={`Use ${bioLabel} to unlock Upward Pay`}
        onPress={() => void handleToggle()}
        trailing={
          processing ? (
            <ActivityIndicator size="small" color={colors.clay} />
          ) : (
            <View
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: enabled ? colors.clay : colors.borderSolid,
                justifyContent: 'center',
                paddingHorizontal: 4,
                alignItems: enabled ? 'flex-end' : 'flex-start',
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colors.bg,
                }}
              />
            </View>
          )
        }
      />

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: spacing[5],
          }}
          onPress={() => setConfirmOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.bg,
              borderRadius: radius.xl,
              padding: spacing[5],
              gap: spacing[4],
            }}
          >
            <TitleText>Enable {bioLabel}</TitleText>
            <BodyText color="textSecondary">
              Enter your password once so we can store credentials securely on this device.
            </BodyText>
            <PasswordInput
              label="Your password"
              value={password}
              onChangeText={setPassword}
              placeholder="Current password"
            />
            {error ? <CaptionText color="error">{error}</CaptionText> : null}
            <Button fullWidth loading={processing} onPress={() => void enableWithPassword()}>
              Enable now
            </Button>
            <Button variant="ghost" fullWidth onPress={() => setConfirmOpen(false)}>
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
