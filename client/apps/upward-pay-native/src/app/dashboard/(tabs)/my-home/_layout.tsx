import { Stack } from 'expo-router'

import { MyHomePropertyProvider } from '@/features/my-home/context/MyHomePropertyContext'

export default function MyHomeLayout() {
  return (
    <MyHomePropertyProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MyHomePropertyProvider>
  )
}
