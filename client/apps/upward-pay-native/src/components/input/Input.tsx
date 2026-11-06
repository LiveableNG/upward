import { useState, type ReactNode } from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'

import { CaptionText, LabelText } from '@/components/text'
import { useResponsive } from '@/hooks/useResponsive'
import { resolveFont, useAppTheme } from '@/theme'

type InputProps = {
  label?: string
  error?: string
  hint?: ReactNode
} & Omit<TextInputProps, 'style'>

export function Input({
  label,
  error,
  hint,
  editable = true,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors, radius, fontsLoaded } = useAppTheme()
  const { scaleFont } = useResponsive()
  const [focused, setFocused] = useState(false)
  const fontSize = scaleFont(15)

  return (
    <View style={{ width: '100%', gap: 8 }}>
      {label ? <LabelText color="textSecondary">{label}</LabelText> : null}
      <TextInput
        {...rest}
        editable={editable}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.clay}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        style={{
          width: '100%',
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.error : focused ? colors.clay : colors.borderSolid,
          backgroundColor: editable ? (focused ? colors.bg : colors.surface) : colors.surface2,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontFamily: resolveFont('jakarta', 'regular', fontsLoaded),
          fontSize,
          lineHeight: Math.round(fontSize * 1.35),
          color: colors.text,
          opacity: editable ? 1 : 0.6,
        }}
      />
      {error ? <CaptionText color="error">{error}</CaptionText> : null}
      {!error && hint ? hint : null}
    </View>
  )
}
