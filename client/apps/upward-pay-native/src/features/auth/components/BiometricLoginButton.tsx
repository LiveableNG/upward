import * as LocalAuthentication from 'expo-local-authentication'
import { Fingerprint, Scan } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { BodyText, CaptionText } from '@/components/text'
import {
  authenticateBiometric,
  getBiometricCredentials,
  getBiometryLabel,
  getBiometryTypes,
  isBiometricsAvailable,
  isBiometricsEnabled,
} from '@/features/auth/security/biometricsService'
import { useAppTheme } from '@/theme'

type BiometricLoginButtonProps = {
  disabled?: boolean
  onAuthenticated: (email: string, password: string) => void
  onError?: (message: string) => void
}

export function BiometricLoginButton({
  disabled,
  onAuthenticated,
  onError,
}: BiometricLoginButtonProps) {
  const { colors, spacing, radius } = useAppTheme()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [bioTypes, setBioTypes] = useState<LocalAuthentication.AuthenticationType[]>([])

  useEffect(() => {
    void (async () => {
      const [avail, enabled, types] = await Promise.all([
        isBiometricsAvailable(),
        isBiometricsEnabled(),
        getBiometryTypes(),
      ])
      setBioTypes(types)
      setReady(avail && enabled)
    })()
  }, [])

  if (!ready) return null

  const label = getBiometryLabel(bioTypes)
  const isFace =
    bioTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
    bioTypes.includes(LocalAuthentication.AuthenticationType.IRIS)

  const handlePress = async () => {
    if (disabled || busy) return
    setBusy(true)
    try {
      const ok = await authenticateBiometric(`Log in to Upward Pay with ${label}`)
      if (!ok) return
      const credentials = await getBiometricCredentials()
      if (!credentials) {
        onError?.(
          'No stored credentials. Sign in with password once, then enable biometrics in Settings.',
        )
        return
      }
      onAuthenticated(credentials.email, credentials.password)
    } catch {
      onError?.('Biometric sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.shellBorder }} />
        <CaptionText color="textMuted">or</CaptionText>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.shellBorder }} />
      </View>
      <Pressable
        onPress={() => void handlePress()}
        disabled={disabled || busy}
        accessibilityRole="button"
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.shellBorder,
          backgroundColor: colors.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color={colors.clay} />
        ) : isFace ? (
          <Scan size={20} color={colors.text} />
        ) : (
          <Fingerprint size={20} color={colors.text} />
        )}
        <BodyText weight="semibold">Log in with {label}</BodyText>
      </Pressable>
    </View>
  )
}
