import { Modal, Pressable } from 'react-native'
import { AlertCircle } from 'lucide-react-native'

import { Button } from '@/components/button/Button'
import { BodyText, HeadingText } from '@/components/text'
import { useAppTheme } from '@/theme'

type ExistsAccountModalProps = {
  visible: boolean
  identifier: string
  onClose: () => void
  onLogin: () => void
}

export function ExistsAccountModal({
  visible,
  identifier,
  onClose,
  onLogin,
}: ExistsAccountModalProps) {
  const { colors, spacing, radius } = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[5],
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.bg,
            borderRadius: radius.xl,
            padding: spacing[6],
            gap: spacing[4],
            alignItems: 'center',
          }}
        >
          <AlertCircle size={32} color={colors.clay} />
          <HeadingText align="center">Account found</HeadingText>
          <BodyText align="center" color="textSecondary">
            An account with {identifier} already exists. Would you like to log in instead?
          </BodyText>
          <Button fullWidth size="pay" onPress={onLogin}>
            Log in to my account
          </Button>
          <Button variant="ghost" fullWidth onPress={onClose}>
            Use a different email
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
