import { Redirect } from 'expo-router'

import { useAuth } from '@/features/auth/AuthProvider'
import { getSetupEntryPath } from '@/features/setup/profileCompletion'

export default function SetupIndex() {
  const { user } = useAuth()
  return <Redirect href={getSetupEntryPath(user)} />
}
