import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Calendar } from 'lucide-react-native'
import { type ReactNode, useMemo, useState } from 'react'
import { Modal, Platform, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { CaptionText, LabelText } from '@/components/text'
import {
  isDateInputValue,
  parseDateInputValue,
  toDateInputValue,
} from '@/features/setup/rentalDates'
import { formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

type DatePickerFieldProps = {
  label: string
  value: string
  onChange: (isoDate: string) => void
  minimumDate?: Date
  maximumDate?: Date
  hint?: ReactNode
  error?: string
  placeholder?: string
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  hint,
  error,
  placeholder = 'Select date',
}: DatePickerFieldProps) {
  const { colors, radius, spacing } = useAppTheme()
  const [open, setOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date())

  const display = useMemo(() => {
    if (!value) return placeholder
    return isDateInputValue(value) ? formatDate(value) : value
  }, [value, placeholder])

  const pickerDate = parseDateInputValue(value) ?? minimumDate ?? new Date()

  const openPicker = () => {
    setPendingDate(pickerDate)
    setOpen(true)
  }

  const closePicker = () => setOpen(false)

  const commitDate = (date: Date) => {
    onChange(toDateInputValue(date))
    closePicker()
  }

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    closePicker()
    if (event.type === 'dismissed' || !date) return
    commitDate(date)
  }

  const onIosInlineChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) return
    setPendingDate(date)
    commitDate(date)
  }

  return (
    <View style={{ width: '100%', gap: 8 }}>
      {label ? <LabelText color="textSecondary">{label}</LabelText> : null}
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.error : open ? colors.clay : colors.borderSolid,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <CaptionText
          style={{
            fontSize: 15,
            color: value ? colors.text : colors.textMuted,
          }}
        >
          {display}
        </CaptionText>
        <Calendar size={18} color={colors.clay} />
      </Pressable>
      {hint}
      {error ? <CaptionText color="error">{error}</CaptionText> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
              }}
              onPress={closePicker}
              accessibilityRole="button"
              accessibilityLabel="Dismiss calendar"
            />
            <View
              style={{
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                backgroundColor: colors.bg,
                paddingBottom: spacing[6],
                paddingTop: spacing[3],
                paddingHorizontal: spacing[4],
                gap: spacing[3],
              }}
            >
              <View
                style={{
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.shellBorder,
                  overflow: 'hidden',
                }}
              >
                <DateTimePicker
                  value={pendingDate}
                  mode="date"
                  display="inline"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={onIosInlineChange}
                  themeVariant="light"
                />
              </View>
              <Button fullWidth onPress={() => commitDate(pendingDate)}>
                Done
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}
