import { useLocalSearchParams } from 'expo-router'

import { WaitlistClaimScreen } from '@/features/auth/screens/WaitlistClaimScreen'

export default function WaitlistClaimRoute() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const resolved = typeof uuid === 'string' ? uuid : ''
  return <WaitlistClaimScreen uuid={resolved} />
}
