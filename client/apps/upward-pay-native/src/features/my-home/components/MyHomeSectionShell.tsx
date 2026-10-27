import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { BodyText, TitleText } from '@/components/text'
import { Screen } from '@/components/screen/Screen'
import { useAppTheme } from '@/theme'

type MyHomeSectionShellProps = {
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function MyHomeSectionShell({ title, children, footer }: MyHomeSectionShellProps) {
  const router = useRouter()
  const { colors, spacing } = useAppTheme()

  return (
    <Screen scroll background="shell" avoidKeyboard>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>
      <TitleText>{title}</TitleText>
      <View style={{ gap: spacing[4] }}>{children}</View>
      {footer}
    </Screen>
  )
}
