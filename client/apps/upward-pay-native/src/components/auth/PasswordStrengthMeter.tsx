import { View } from 'react-native'
import { Check, X } from 'lucide-react-native'

import { CaptionText, LabelText } from '@/components/text'
import { countPasswordRequirementsMet, PASSWORD_REQUIREMENTS } from '@/lib/password'
import { useAppTheme } from '@/theme'

type PasswordStrengthMeterProps = {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { colors, radius } = useAppTheme()
  const metCount = countPasswordRequirementsMet(password)

  const strength =
    password.length === 0
      ? { text: 'Too short', color: colors.textMuted, segments: 0 }
      : metCount === 1
        ? { text: 'Weak', color: colors.error, segments: 1 }
        : metCount === 2
          ? { text: 'Fair', color: colors.warning, segments: 2 }
          : { text: 'Strong', color: colors.success, segments: 3 }

  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: radius.full,
                backgroundColor: index < strength.segments ? strength.color : colors.surface2,
              }}
            />
          ))}
        </View>
        <LabelText style={{ color: strength.color }}>{strength.text}</LabelText>
      </View>
      <View style={{ gap: 6 }}>
        {PASSWORD_REQUIREMENTS.map((req) => {
          const met = req.regex.test(password)
          return (
            <View key={req.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {met ? (
                <Check size={12} color={colors.success} />
              ) : (
                <X size={12} color={colors.textMuted} />
              )}
              <CaptionText color={met ? 'textSecondary' : 'textMuted'}>{req.label}</CaptionText>
            </View>
          )
        })}
      </View>
    </View>
  )
}
