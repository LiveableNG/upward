import { View } from 'react-native'

import { useAppTheme } from '@/theme'
import { APP_PIN_LENGTH } from '@/features/auth/security/pinConfig'

type PinDotRowProps = {
  filled: number
  error?: boolean
  shake?: boolean
}

export function PinDotRow({ filled, error = false }: PinDotRowProps) {
  const { colors, radius } = useAppTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: error ? colors.error : colors.borderSolid,
        backgroundColor: colors.surface,
      }}
    >
      {Array.from({ length: APP_PIN_LENGTH }).map((_, index) => {
        const isFilled = index < filled
        return (
          <View
            key={index}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: isFilled ? (error ? colors.error : colors.text) : colors.borderSolid,
              transform: [{ scale: isFilled ? 1.15 : 1 }],
            }}
          />
        )
      })}
    </View>
  )
}
