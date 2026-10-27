import { Star } from 'lucide-react-native'
import { Modal, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { BodyText, TitleText } from '@/components/text'
import { useAppTheme } from '@/theme'

type Props = {
  visible: boolean
  onSkip: () => void
  onGiveFeedback: () => void
}

export function ComplaintFeedbackPromptModal({ visible, onSkip, onGiveFeedback }: Props) {
  const { colors, spacing, radius } = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: spacing[4],
        }}
      >
        <Card style={{ gap: spacing[4], alignItems: 'center' }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.full,
              backgroundColor: colors.shellTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Star size={26} color={colors.clay} />
          </View>
          <TitleText style={{ textAlign: 'center' }}>Would you like to give feedback?</TitleText>
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            Your feedback helps us improve complaint resolution for your home.
          </BodyText>
          <View style={{ width: '100%', gap: spacing[2] }}>
            <Button fullWidth onPress={onGiveFeedback}>
              Give feedback
            </Button>
            <Button variant="ghost" fullWidth onPress={onSkip}>
              Skip for now
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  )
}
