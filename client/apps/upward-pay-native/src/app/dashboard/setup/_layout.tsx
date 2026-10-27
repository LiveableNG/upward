import { Stack } from 'expo-router'

import { SetupDraftProvider } from '@/features/setup/SetupDraftContext'

export default function SetupLayout() {
  return (
    <SetupDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SetupDraftProvider>
  )
}
