import { type ReactNode } from 'react'
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native'

import { useResponsive } from '@/hooks/useResponsive'
import {
  resolveFont,
  textRoles,
  useAppTheme,
  type FontFamily,
  type FontWeight,
  type TextRole,
  type ThemeColorName,
} from '@/theme'

export type AppTextProps = {
  color?: ThemeColorName
  weight?: FontWeight
  align?: TextStyle['textAlign']
  family?: FontFamily
  style?: StyleProp<TextStyle>
  children?: ReactNode
} & Omit<TextProps, 'style' | 'children'>

type AppTextInternalProps = AppTextProps & {
  textRole: TextRole
}

/**
 * Shared text primitive. Screens should use the named components in this folder
 * (`BodyText`, `TitleText`, and the rest) so each size stays consistent.
 */
export function AppText({
  textRole,
  color = 'text',
  weight,
  align,
  family = 'jakarta',
  style,
  children,
  ...rest
}: AppTextInternalProps) {
  const { colors, fontsLoaded } = useAppTheme()
  const { scaleFont } = useResponsive()
  const roleStyle = textRoles[textRole]
  const resolvedWeight = weight ?? roleStyle.weight
  const fontSize = scaleFont(roleStyle.fontSize)
  const lineHeight = Math.max(
    fontSize + 2,
    Math.round(roleStyle.lineHeight * (fontSize / roleStyle.fontSize)),
  )
  const letterSpacing = roleStyle.letterSpacing * (fontSize / roleStyle.fontSize)

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        style,
        {
          color: colors[color],
          fontFamily: resolveFont(family, resolvedWeight, fontsLoaded),
          fontSize,
          lineHeight,
          letterSpacing,
          textAlign: align,
          ...(roleStyle.uppercase ? { textTransform: 'uppercase' as const } : null),
        },
      ]}
    >
      {children}
    </Text>
  )
}
