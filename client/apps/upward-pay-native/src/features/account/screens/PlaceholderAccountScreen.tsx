import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable } from 'react-native'

import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, EyebrowText, TitleText } from '@/components/text'
import { useAppTheme } from '@/theme'

type PlaceholderAccountScreenProps = {
  title: string
  body: string
}

export function PlaceholderAccountScreen({ title, body }: PlaceholderAccountScreenProps) {
  const router = useRouter()
  const { colors } = useAppTheme()

  return (
    <Screen scroll background="shell">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>
      <EyebrowText color="clay">Coming soon</EyebrowText>
      <TitleText>{title}</TitleText>
      <Card>
        <BodyText color="textSecondary">{body}</BodyText>
      </Card>
    </Screen>
  )
}
