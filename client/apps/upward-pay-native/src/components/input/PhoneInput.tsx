import { TextInput, View } from 'react-native'

import { CaptionText, LabelText } from '@/components/text'
import { resolveFont, useAppTheme } from '@/theme'

type PhoneInputProps = {
  label?: string
  value: string
  onChangeText: (value: string) => void
  error?: string
}

export function PhoneInput({
  label = 'Phone number',
  value,
  onChangeText,
  error,
}: PhoneInputProps) {
  const { colors, radius, fontsLoaded } = useAppTheme()

  return (
    <View style={{ width: '100%', gap: label ? 8 : 0 }}>
      {label ? <LabelText color="textSecondary">{label}</LabelText> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.error : colors.borderSolid,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
        }}
      >
        <CaptionText
          color="textSecondary"
          style={{
            marginRight: 8,
            paddingRight: 8,
            borderRightWidth: 1,
            borderRightColor: colors.borderSolid,
          }}
        >
          +234
        </CaptionText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="800 000 0000"
          keyboardType="phone-pad"
          autoComplete="tel"
          style={{
            flex: 1,
            fontFamily: resolveFont('jakarta', 'regular', fontsLoaded),
            fontSize: 15,
            color: colors.text,
          }}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {error ? <CaptionText color="error">{error}</CaptionText> : null}
    </View>
  )
}
