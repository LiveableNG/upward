import { type ReactElement, type ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'

import { SHELL_MAX_WIDTH, useResponsive } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

type ScreenBackground = 'bg' | 'shell' | 'surface'

type ScreenProps = {
  children: ReactNode
  scroll?: boolean
  background?: ScreenBackground
  padded?: boolean
  avoidKeyboard?: boolean
  edges?: readonly Edge[]
  contentStyle?: StyleProp<ViewStyle>
  refreshControl?: ReactElement<RefreshControlProps>
}

export function Screen({
  children,
  scroll = false,
  background = 'bg',
  padded = true,
  avoidKeyboard = false,
  edges = ['top', 'right', 'bottom', 'left'],
  contentStyle,
  refreshControl,
}: ScreenProps) {
  const { colors, spacing } = useAppTheme()
  const { screenPadding } = useResponsive()
  const backgroundColor =
    background === 'shell'
      ? colors.shellPageBg
      : background === 'surface'
        ? colors.surface
        : colors.bg

  const content = (
    <View
      style={[
        {
          flexGrow: 1,
          flex: scroll ? undefined : 1,
          paddingHorizontal: padded ? screenPadding : 0,
          paddingTop: padded ? spacing[6] : 0,
          paddingBottom: padded ? spacing[8] : 0,
          gap: spacing[5],
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  )

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {content}
    </ScrollView>
  ) : (
    content
  )

  const frame = avoidKeyboard ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor, alignItems: 'center' }} edges={edges}>
      <View style={{ flex: 1, width: '100%', maxWidth: SHELL_MAX_WIDTH }}>{frame}</View>
    </SafeAreaView>
  )
}
