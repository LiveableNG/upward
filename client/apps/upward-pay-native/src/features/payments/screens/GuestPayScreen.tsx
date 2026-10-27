import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/button/Button'
import { UpwardLogo } from '@/components/brand/UpwardLogo'
import { BodyText, CaptionText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { UnifiedCheckoutScreen } from '@/features/payments/screens/UnifiedCheckoutScreen'
import { useAppTheme } from '@/theme'

type GuestPayScreenProps = {
  paymentUuid: string
}

export function GuestPayScreen({ paymentUuid }: GuestPayScreenProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useAppTheme()
  const { isLoggedIn } = useAuth()

  return (
    <View style={{ flex: 1, backgroundColor: colors.shellPageBg }}>
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.shellBorder,
          backgroundColor: colors.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 }}>
          <UpwardLogo size={32} />
          <View style={{ flex: 1 }}>
            <BodyText weight="semibold">Upward Pay</BodyText>
            <CaptionText color="textMuted">Secure rent payment</CaptionText>
          </View>
        </View>
        {!isLoggedIn ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/login',
                params: { email: '', redirect: `/pay/${paymentUuid}` },
              })
            }
          >
            Sign in
          </Button>
        ) : null}
      </View>
      <UnifiedCheckoutScreen paymentUuid={paymentUuid} mode="public" />
    </View>
  )
}
