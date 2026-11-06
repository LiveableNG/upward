import { type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import { useResponsive } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

type CardProps = {
  children: ReactNode
  tone?: 'bg' | 'surface' | 'tint'
  style?: StyleProp<ViewStyle>
}

export function Card({ children, tone = 'bg', style }: CardProps) {
  const { colors, radius } = useAppTheme()
  const { cardPadding } = useResponsive()
  const backgroundColor =
    tone === 'tint' ? colors.shellTint : tone === 'surface' ? colors.surface : colors.bg

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.shellBorder,
          padding: cardPadding,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
