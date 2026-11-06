import 'react-native-gesture-handler'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect, useState } from 'react'

import { PaymentEventsSync } from '@/features/auth/components/PaymentEventsSync'
import { PushNotificationsSync } from '@/features/notifications/components/PushNotificationsSync'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppThemeProvider, appFonts, lightColors, useAppTheme } from '@/theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [loaded, error] = useFonts(appFonts)
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(lightColors.shellPageBg)
  }, [])

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync()
    }
  }, [loaded, error])

  if (!loaded && !error) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider fontsLoaded={loaded}>
        <AuthProvider>
          <PaymentEventsSync />
          <PushNotificationsSync />
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  )
}

function RootNavigator() {
  const { colors } = useAppTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  )
}
