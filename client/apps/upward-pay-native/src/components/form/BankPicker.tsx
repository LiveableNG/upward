import { ChevronDown } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { BodyText, LabelText, TitleText } from '@/components/text'
import { type BankOption } from '@/features/payments/services/paymentService'
import { useAppTheme } from '@/theme'

type BankPickerProps = {
  label: string
  banks: BankOption[]
  bankCode: string
  onChange: (bank: BankOption) => void
  placeholder?: string
}

export function BankPicker({ label, banks, bankCode, onChange, placeholder }: BankPickerProps) {
  const { colors, radius, spacing } = useAppTheme()
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => banks.find((b) => b.code === bankCode), [banks, bankCode])
  const display = selected?.name || placeholder || 'Select bank'

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
        <BodyText color={selected ? 'text' : 'textMuted'}>{display}</BodyText>
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
              borderTopRightRadius: radius.xl,
              paddingTop: spacing[4],
              paddingBottom: spacing[8],
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[3] }}>
              <TitleText>{label}</TitleText>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {banks.map((bank) => {
                const isSelected = bank.code === bankCode
                return (
                  <Pressable
                    key={bank.code}
                    onPress={() => {
                      onChange(bank)
                      setOpen(false)
                    }}
                    style={{
                      paddingHorizontal: spacing[5],
                      paddingVertical: spacing[3],
                      backgroundColor: isSelected ? colors.surface2 : colors.bg,
                    }}
                  >
                    <BodyText weight={isSelected ? 'semibold' : undefined}>{bank.name}</BodyText>
                    <BodyText color="textMuted">{bank.code}</BodyText>
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
