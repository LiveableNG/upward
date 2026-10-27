import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'

import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, LabelText, TitleText } from '@/components/text'
import { HEAR_ABOUT_US_OPTIONS, type HearAboutUsId } from '@/features/auth/constants'
import { useAppTheme } from '@/theme'

type HearAboutSelectProps = {
  value: HearAboutUsId | ''
  onChange: (value: HearAboutUsId | '') => void
  otherText: string
  onChangeOtherText: (value: string) => void
}

export function HearAboutSelect({
  value,
  onChange,
  otherText,
  onChangeOtherText,
}: HearAboutSelectProps) {
  const { colors, spacing, radius } = useAppTheme()
  const [open, setOpen] = useState(false)
  const selectedLabel = HEAR_ABOUT_US_OPTIONS.find((o) => o.id === value)?.label

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <LabelText color="textSecondary">Where did you hear about us?</LabelText>
        <CaptionText color="textMuted">Optional</CaptionText>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderSolid,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <BodyText color={value ? 'text' : 'textMuted'}>
          {selectedLabel ?? 'Select channel (optional)'}
        </BodyText>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>

      {value === 'other' ? (
        <Input
          value={otherText}
          onChangeText={onChangeOtherText}
          placeholder="Please specify (optional)"
        />
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing[5],
              maxHeight: '70%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <TitleText style={{ marginBottom: spacing[4] }}>Where did you hear about us?</TitleText>
            <ScrollView>
              <Pressable
                onPress={() => {
                  onChange('')
                  setOpen(false)
                }}
                style={{ paddingVertical: spacing[3] }}
              >
                <BodyText color="textMuted">Clear selection</BodyText>
              </Pressable>
              {HEAR_ABOUT_US_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
                  style={{
                    paddingVertical: spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.shellBorder,
                  }}
                >
                  <BodyText color={value === option.id ? 'clay' : 'text'}>{option.label}</BodyText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
