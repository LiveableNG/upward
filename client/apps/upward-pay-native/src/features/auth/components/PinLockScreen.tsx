import * as LocalAuthentication from 'expo-local-authentication'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { UpwardLogo } from '@/components/brand/UpwardLogo'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { PinDotRow } from '@/features/auth/components/PinDotRow'
import { PinKeypad } from '@/features/auth/components/PinKeypad'
import { APP_PIN_LENGTH } from '@/features/auth/security/pinConfig'
import {
  authenticateBiometric,
  getBiometryLabel,
  getBiometryTypes,
  isBiometricsAvailable,
  isBiometricsEnabled,
  setJustUnlocked,
} from '@/features/auth/security/biometricsService'
import { clearAppPin, verifyAppPin, type PinUserInfo } from '@/features/auth/security/pinService'
import { useAppTheme } from '@/theme'

type PinLockScreenProps = {
  visible: boolean
  user: PinUserInfo
  onUnlock: () => void
  onLogout: () => void
}

export function PinLockScreen({ visible, user, onUnlock, onLogout }: PinLockScreenProps) {
  const { colors, spacing } = useAppTheme()
  const [pin, setPin] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [bioTypes, setBioTypes] = useState<LocalAuthentication.AuthenticationType[]>([])
  const [canUseBio, setCanUseBio] = useState(false)
  const autoBio = useRef(false)

  const displayName = user.firstName || user.email.split('@')[0] || 'there'
  const bioLabel = getBiometryLabel(bioTypes)
  const isFace =
    bioTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
    bioTypes.includes(LocalAuthentication.AuthenticationType.IRIS)

  useEffect(() => {
    if (!visible) {
      setPin([])
      setError(null)
      autoBio.current = false
      return
    }

    let mounted = true
    void (async () => {
      const [avail, enabled, types] = await Promise.all([
        isBiometricsAvailable(),
        isBiometricsEnabled(),
        getBiometryTypes(),
      ])
      if (!mounted) return
      setBioTypes(types)
      const allowed = avail && enabled
      setCanUseBio(allowed)
      if (allowed && !autoBio.current) {
        autoBio.current = true
        setTimeout(() => {
          if (mounted) void tryBiometric()
        }, 400)
      }
    })()

    return () => {
      mounted = false
    }
  }, [visible])

  const tryBiometric = async () => {
    if (busy) return
    setBusy(true)
    try {
      const ok = await authenticateBiometric(`Confirm ${bioLabel} to access Upward Pay`)
      if (ok) {
        setJustUnlocked()
        onUnlock()
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDigit = async (digit: string) => {
    if (busy || pin.length >= APP_PIN_LENGTH) return
    setError(null)
    const next = [...pin, digit]
    setPin(next)
    if (next.length < APP_PIN_LENGTH) return

    setBusy(true)
    const valid = await verifyAppPin(next.join(''))
    if (valid) {
      setJustUnlocked()
      onUnlock()
      setPin([])
    } else {
      setError('Incorrect PIN')
      setPin([])
    }
    setBusy(false)
  }

  const handleLogout = async () => {
    await clearAppPin()
    onLogout()
  }

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing[6],
            paddingTop: spacing[8],
            paddingBottom: spacing[6],
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: spacing[4] }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.clayFaint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UpwardLogo size={32} />
            </View>
            <TitleText>{displayName},</TitleText>
            <BodyText color="textSecondary">
              Enter your {APP_PIN_LENGTH}-digit PIN to open Upward Pay.
            </BodyText>
            <Pressable onPress={() => void handleLogout()} accessibilityRole="button">
              <BodyText color="textSecondary">
                Not you? <BodyText weight="semibold">Log out</BodyText>
              </BodyText>
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', gap: spacing[3] }}>
            <PinDotRow filled={pin.length} error={Boolean(error)} />
            {error ? <CaptionText color="error">{error}</CaptionText> : null}
            {busy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={colors.clay} size="small" />
                <CaptionText color="textMuted">Verifying…</CaptionText>
              </View>
            ) : (
              <CaptionText color="textMuted">100% encrypted on this device</CaptionText>
            )}
          </View>

          <PinKeypad
            disabled={busy}
            onDigit={(d) => void handleDigit(d)}
            onDelete={() => {
              if (busy) return
              setError(null)
              setPin((prev) => prev.slice(0, -1))
            }}
            onBiometric={canUseBio ? () => void tryBiometric() : undefined}
            biometricIcon={isFace ? 'face' : 'fingerprint'}
          />
        </View>
      </SafeAreaView>
    </Modal>
  )
}
