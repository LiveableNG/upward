import { ChevronRight } from 'lucide-react-native'
import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { BodyText, CaptionText } from '@/components/text'
import { useAppTheme } from '@/theme'

type SettingsRowProps = {
  icon: ReactNode
  title: string
  description?: string
  onPress: () => void
  destructive?: boolean
  trailing?: ReactNode
}

export function SettingsRow({
  icon,
  title,
  description,
  onPress,
  destructive,
  trailing,
}: SettingsRowProps) {
  const { colors, radius, spacing } = useAppTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        backgroundColor: pressed ? colors.surface : 'transparent',
        borderRadius: radius.md,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: destructive ? 'rgba(220,38,38,0.08)' : colors.shellTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <BodyText weight="semibold" color={destructive ? 'error' : 'text'}>
          {title}
        </BodyText>
        {description ? <CaptionText color="textSecondary">{description}</CaptionText> : null}
      </View>
      {trailing ?? <ChevronRight size={18} color={colors.textMuted} />}
    </Pressable>
  )
}
