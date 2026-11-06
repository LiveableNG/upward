import { ChevronLeft } from 'lucide-react-native'
import { type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BodyText, TitleText } from '@/components/text'
import { SHELL_MAX_WIDTH, useResponsive } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

type SetupPageShellProps = {
  title: string
  subtitle?: string
  onBack?: () => void
  footer?: ReactNode
  children: ReactNode
}

export function SetupPageShell({ title, subtitle, onBack, footer, children }: SetupPageShellProps) {
  const { colors, spacing } = useAppTheme()
  const { screenPadding } = useResponsive()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.shellPageBg, alignItems: 'center' }}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%', maxWidth: SHELL_MAX_WIDTH }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: screenPadding,
            paddingTop: spacing[6],
            paddingBottom: spacing[4],
            gap: spacing[5],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                alignSelf: 'flex-start',
              }}
            >
              <ChevronLeft size={22} color={colors.textSecondary} />
              <BodyText color="textSecondary">Back</BodyText>
            </Pressable>
          ) : null}

          <View style={{ gap: spacing[2] }}>
            <TitleText>{title}</TitleText>
            {subtitle ? <BodyText color="textSecondary">{subtitle}</BodyText> : null}
          </View>

          <View style={{ gap: spacing[4], flex: 1 }}>{children}</View>
        </ScrollView>

        {footer ? (
          <View
            style={{
              paddingHorizontal: screenPadding,
              paddingBottom: spacing[6],
              paddingTop: spacing[3],
              borderTopWidth: 1,
              borderTopColor: colors.borderSolid,
              backgroundColor: colors.shellPageBg,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
