import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'

import { UpwardLogo } from '@/components/brand/UpwardLogo'
import { SHELL_MAX_WIDTH } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

type AuthShellProps = {
  children: ReactNode
  onBack?: () => void
  variant?: 'welcome' | 'form'
}

export function AuthShell({ children, onBack, variant = 'form' }: AuthShellProps) {
  const { colors, spacing } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing[4],
        paddingBottom: insets.bottom + spacing[4],
        paddingHorizontal: spacing[5],
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: SHELL_MAX_WIDTH, flex: 1, gap: spacing[6] }}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={{ height: variant === 'welcome' ? 8 : 44 }} />
        )}

        <View style={{ alignItems: 'center' }}>
          <UpwardLogo size={variant === 'welcome' ? 36 : 28} color={colors.clay} />
        </View>

        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  )
}
