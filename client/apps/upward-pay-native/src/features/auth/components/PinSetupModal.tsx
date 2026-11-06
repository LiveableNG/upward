import * as LocalAuthentication from 'expo-local-authentication'
import { X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { UpwardLogo } from '@/components/brand/UpwardLogo'
import { Button } from '@/components/button/Button'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { PinDotRow } from '@/features/auth/components/PinDotRow'
import { PinKeypad } from '@/features/auth/components/PinKeypad'
import { APP_PIN_LENGTH } from '@/features/auth/security/pinConfig'
import {
  getBiometryLabel,
  getBiometryTypes,
  isBiometricsAvailable,
} from '@/features/auth/security/biometricsService'
import { setupAppPin, type PinUserInfo } from '@/features/auth/security/pinService'
import { useAppTheme } from '@/theme'

type PinSetupModalProps = {
  visible: boolean
  user: PinUserInfo
  onComplete: () => void
  onDismiss?: () => void
  allowDismiss?: boolean
}

type Stage = 'create' | 'confirm' | 'biometric'

export function PinSetupModal({
  visible,
  user,
  onComplete,
  onDismiss,
  allowDismiss = true,
}: PinSetupModalProps) {
  const { colors, spacing, radius } = useAppTheme()
  const [stage, setStage] = useState<Stage>('create')
  const [firstPin, setFirstPin] = useState<string[]>([])
  const [confirmPin, setConfirmPin] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioTypes, setBioTypes] = useState<LocalAuthentication.AuthenticationType[]>([])

  const current = stage === 'create' ? firstPin : confirmPin
  const bioLabel = getBiometryLabel(bioTypes)
  const isFace =
    bioTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
    bioTypes.includes(LocalAuthentication.AuthenticationType.IRIS)

  useEffect(() => {
    if (!visible) {
      setStage('create')
      setFirstPin([])
      setConfirmPin([])
      setError(null)
      return
    }
    void (async () => {
      const avail = await isBiometricsAvailable()
      setBioAvailable(avail)
      if (avail) setBioTypes(await getBiometryTypes())
    })()
  }, [visible])

  const finalize = async (enableBio: boolean) => {
    await setupAppPin(firstPin.join(''), user, enableBio)
    onComplete()
  }

  const handleDigit = (digit: string) => {
    if (stage === 'biometric' || current.length >= APP_PIN_LENGTH) return
    setError(null)

    if (stage === 'create') {
      const next = [...firstPin, digit]
      setFirstPin(next)
      if (next.length === APP_PIN_LENGTH) {
        setTimeout(() => setStage('confirm'), 150)
      }
      return
    }

    const next = [...confirmPin, digit]
    setConfirmPin(next)
    if (next.length === APP_PIN_LENGTH) {
      const a = firstPin.join('')
      const b = next.join('')
      if (a === b) {
        if (bioAvailable) setStage('biometric')
        else void finalize(false)
      } else {
        setError('PINs did not match. Try again.')
        setFirstPin([])
        setConfirmPin([])
        setStage('create')
      }
    }
  }

  const handleDelete = () => {
    if (stage === 'create') setFirstPin((p) => p.slice(0, -1))
    else if (stage === 'confirm') setConfirmPin((p) => p.slice(0, -1))
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing[6],
            paddingTop: spacing[6],
            paddingBottom: spacing[6],
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: spacing[4] }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
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
              {allowDismiss ? (
                <Pressable
                  onPress={onDismiss ?? onComplete}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {stage === 'create' ? (
              <>
                <TitleText>Set your {APP_PIN_LENGTH}-digit PIN</TitleText>
                <BodyText color="textSecondary">
                  Use this PIN to unlock Upward Pay when you return to the app.
                </BodyText>
              </>
            ) : null}
            {stage === 'confirm' ? (
              <>
                <TitleText>Confirm your PIN</TitleText>
                <BodyText color="textSecondary">Enter the same PIN again.</BodyText>
              </>
            ) : null}
            {stage === 'biometric' ? (
              <>
                <TitleText>Enable {bioLabel}?</TitleText>
                <BodyText color="textSecondary">
                  Unlock faster with {bioLabel} on this device.
                </BodyText>
              </>
            ) : null}
          </View>

          {stage !== 'biometric' ? (
            <>
              <View style={{ alignItems: 'center', gap: spacing[2] }}>
                <PinDotRow filled={current.length} error={Boolean(error)} />
                {error ? <CaptionText color="error">{error}</CaptionText> : null}
              </View>
              <PinKeypad
                onDigit={handleDigit}
                onDelete={handleDelete}
                biometricIcon={isFace ? 'face' : 'fingerprint'}
              />
            </>
          ) : (
            <View style={{ gap: spacing[3], marginTop: 'auto' }}>
              <Button fullWidth onPress={() => void finalize(true)}>
                Enable {bioLabel}
              </Button>
              <Button variant="ghost" fullWidth onPress={() => void finalize(false)}>
                Maybe later
              </Button>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}
