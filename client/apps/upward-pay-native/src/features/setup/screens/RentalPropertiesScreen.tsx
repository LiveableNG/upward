import { useRouter } from 'expo-router'
import { ChevronLeft, Home, Plus } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { type UserProperty } from '@/features/auth/types'
import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { setupAddPropertyPath, setupEditPropertyPath } from '@/features/setup/setupPaths'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

function formatAddress(prop: UserProperty): string {
  return [prop.location?.address || prop.address, prop.location?.area, prop.location?.state]
    .filter(Boolean)
    .join(', ')
}

export function RentalPropertiesScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const { user } = useAuth()
  const { colors, spacing } = useAppTheme()
  const properties = user?.properties ?? []

  return (
    <Screen scroll background="shell">
      <Pressable
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Tenancy</EyebrowText>
      <TitleText>Rental details</TitleText>
      <BodyText color="textSecondary">View and update your linked properties.</BodyText>

      <View style={{ gap: spacing[3] }}>
        {properties.length === 0 ? (
          <Card>
            <BodyText color="textSecondary">No properties linked yet.</BodyText>
            <Button fullWidth onPress={() => go(setupAddPropertyPath())}>
              Add property
            </Button>
          </Card>
        ) : (
          properties.map((prop) => (
            <Pressable
              key={prop.uuid ?? prop.address}
              onPress={() => {
                if (prop.uuid) go(setupEditPropertyPath(prop.uuid))
              }}
            >
              <Card style={{ gap: spacing[2] }}>
                <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.clayFaint,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Home size={20} color={colors.clay} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <BodyText weight="semibold">
                      {prop.location?.area || prop.address || 'Property'}
                    </BodyText>
                    <CaptionText color="textSecondary">
                      {formatAddress(prop) || 'Address not set'}
                    </CaptionText>
                    {prop.rentAmount ? (
                      <CaptionText color="textMuted">
                        {formatCurrency(prop.rentAmount)}
                        {prop.rentEndDate ? ` · due ${formatDate(prop.rentEndDate)}` : ''}
                      </CaptionText>
                    ) : null}
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </View>

      {properties.length > 0 ? (
        <Button variant="secondary" fullWidth onPress={() => go(setupAddPropertyPath())}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color={colors.clay} />
            <BodyText color="clay">Add another property</BodyText>
          </View>
        </Button>
      ) : null}
    </Screen>
  )
}
