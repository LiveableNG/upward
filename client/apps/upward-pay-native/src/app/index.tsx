import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useAuth } from '@/features/auth/AuthProvider'
import { useAppTheme } from '@/theme'

export default function Index() {
  const { isLoggedIn, loading } = useAuth()
  const { colors } = useAppTheme()

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.shellPageBg,
        }}
      >
        <ActivityIndicator color={colors.clay} />
      </View>
    )
  }

  if (isLoggedIn) {
    return <Redirect href="/dashboard" />
  }

  return <Redirect href="/welcome" />
}
