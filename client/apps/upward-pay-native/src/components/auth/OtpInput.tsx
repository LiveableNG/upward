import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { Pressable, TextInput, View } from 'react-native'

import { BodyText, CaptionText, LabelText, TitleText } from '@/components/text'
import { resolveFont, useAppTheme } from '@/theme'

type OtpInputProps = {
  destination: string
  onVerify: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onChangeDestination?: () => void
  loading?: boolean
  error?: string | null
}

export function OtpInput({
  destination,
  onVerify,
  onResend,
  onChangeDestination,
  loading = false,
  error,
}: OtpInputProps) {
  const { colors, radius, fontsLoaded } = useAppTheme()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(30)
  const refs = useRef<(ComponentRef<typeof TextInput> | null)[]>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (timer <= 0) return
    const id = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [timer])

  const submitIfComplete = async (next: string[]) => {
    const code = next.join('')
    if (code.length === 6 && !loading) {
      await onVerify(code)
    }
  }

  const updateDigit = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) refs.current[index + 1]?.focus()
    void submitIfComplete(next)
  }

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <TitleText>Enter verification code</TitleText>
        <BodyText color="textSecondary">We sent a 6-digit code to {destination}.</BodyText>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              refs.current[index] = el
            }}
            value={digit}
            onChangeText={(value) => updateDigit(index, value)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!loading}
            style={{
              flex: 1,
              maxWidth: 52,
              minHeight: 56,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: error ? colors.error : colors.borderSolid,
              backgroundColor: colors.surface,
              textAlign: 'center',
              fontFamily: resolveFont('jakarta', 'bold', fontsLoaded),
              fontSize: 20,
              color: colors.text,
            }}
          />
        ))}
      </View>

      {error ? <CaptionText color="error">{error}</CaptionText> : null}

      <View style={{ gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          disabled={timer > 0 || loading}
          onPress={async () => {
            await onResend()
            setTimer(30)
            setDigits(['', '', '', '', '', ''])
            refs.current[0]?.focus()
          }}
        >
          <LabelText color={timer > 0 ? 'textMuted' : 'clay'}>
            {timer > 0 ? `Resend code in ${timer}s` : 'Resend code'}
          </LabelText>
        </Pressable>
        {onChangeDestination ? (
          <Pressable accessibilityRole="button" onPress={onChangeDestination}>
            <LabelText color="clay">Use a different email or phone</LabelText>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
