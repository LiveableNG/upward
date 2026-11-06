import { ChevronDown } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { BodyText, CaptionText, LabelText, TitleText } from '@/components/text'
import { useAppTheme } from '@/theme'

type OptionPickerProps = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}

export function OptionPicker({ label, value, options, onChange, placeholder }: OptionPickerProps) {
  const { colors, radius, spacing } = useAppTheme()
  const [open, setOpen] = useState(false)

  const display = value || placeholder || 'Select'

  const sortedOptions = useMemo(() => [...options], [options])

  return (
    <View style={{ gap: 8 }}>
      <LabelText color="textSecondary">{label}</LabelText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderSolid,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <BodyText color={value ? 'text' : 'textMuted'}>{display}</BodyText>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              maxHeight: '70%',
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingTop: spacing[4],
              paddingBottom: spacing[8],
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[3] }}>
              <TitleText>{label}</TitleText>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {sortedOptions.map((option) => {
                const selected = option === value
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onChange(option)
                      setOpen(false)
                    }}
                    style={{
                      paddingHorizontal: spacing[5],
                      paddingVertical: spacing[3],
                      backgroundColor: selected ? colors.surface2 : colors.bg,
                    }}
                  >
                    <BodyText color={selected ? 'clayDeep' : 'text'}>{option}</BodyText>
                    {selected ? (
                      <CaptionText color="clay" style={{ marginTop: 2 }}>
                        Selected
                      </CaptionText>
                    ) : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
