import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { CaptionText } from '@/components/text'
import { useAppTheme } from '@/theme'

type CheckboxFieldProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
}

export function CheckboxField({ checked, onChange, label }: CheckboxFieldProps) {
  const { colors, radius } = useAppTheme()

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          marginTop: 2,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: checked ? colors.clay : colors.borderSolid,
          backgroundColor: checked ? colors.clay : colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <CaptionText color="white">✓</CaptionText> : null}
      </View>
      <View style={{ flex: 1 }}>{label}</View>
    </Pressable>
  )
}
