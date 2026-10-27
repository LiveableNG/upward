import { Delete, Fingerprint, Scan } from 'lucide-react-native'
import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { TitleText } from '@/components/text'
import { useAppTheme } from '@/theme'

type PinKeypadProps = {
  onDigit: (digit: string) => void
  onDelete: () => void
  onBiometric?: () => void
  biometricIcon?: 'face' | 'fingerprint'
  disabled?: boolean
}

function PinKey({
  label,
  onPress,
  disabled,
  variant = 'digit',
}: {
  label: ReactNode
  onPress: () => void
  disabled?: boolean
  variant?: 'digit' | 'action' | 'blank'
}) {
  const { colors } = useAppTheme()
  if (variant === 'blank') {
    return <View style={{ width: 72, height: 72 }} />
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          variant === 'digit'
            ? pressed
              ? colors.surface2
              : colors.surface
            : pressed
              ? colors.surface2
              : 'transparent',
        opacity: disabled ? 0.45 : 1,
      })}
    >
      {typeof label === 'string' ? (
        <TitleText style={{ fontSize: 26, fontWeight: '500' }}>{label}</TitleText>
      ) : (
        label
      )}
    </Pressable>
  )
}

export function PinKeypad({
  onDigit,
  onDelete,
  onBiometric,
  biometricIcon = 'fingerprint',
  disabled = false,
}: PinKeypadProps) {
  const { colors } = useAppTheme()
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ] as const

  return (
    <View style={{ width: '100%', maxWidth: 320, gap: 14, alignSelf: 'center' }}>
      {rows.map((row) => (
        <View key={row.join('')} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {row.map((digit) => (
            <PinKey key={digit} label={digit} disabled={disabled} onPress={() => onDigit(digit)} />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {onBiometric ? (
          <PinKey
            variant="action"
            disabled={disabled}
            label={
              biometricIcon === 'face' ? (
                <Scan size={26} color={colors.textSecondary} />
              ) : (
                <Fingerprint size={26} color={colors.textSecondary} />
              )
            }
            onPress={onBiometric}
          />
        ) : (
          <PinKey variant="blank" label="" onPress={() => {}} />
        )}
        <PinKey label="0" disabled={disabled} onPress={() => onDigit('0')} />
        <PinKey
          variant="action"
          disabled={disabled}
          label={<Delete size={24} color={colors.error} />}
          onPress={onDelete}
        />
      </View>
    </View>
  )
}
