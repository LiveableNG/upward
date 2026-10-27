import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useAuth } from '@/features/auth/AuthProvider'
import { useAppTheme } from '@/theme'

export default function DashboardLayout() {
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

  if (!isLoggedIn) {
    return <Redirect href="/welcome" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.shellPageBg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="score-breakdown" />
      <Stack.Screen name="receipt" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="savings" />
      <Stack.Screen name="benefits" />
      <Stack.Screen name="help" />
      <Stack.Screen name="verify-identity" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="deposit-balance" />
      <Stack.Screen name="request-records" />
      <Stack.Screen name="rent-calculator" />
      <Stack.Screen name="exclusive-homes" />
      <Stack.Screen name="rent-support-insurance" />
    </Stack>
  )
}
