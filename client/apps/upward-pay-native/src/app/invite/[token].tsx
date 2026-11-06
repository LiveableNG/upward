import { useLocalSearchParams } from 'expo-router'

import { InviteClaimScreen } from '@/features/auth/screens/InviteClaimScreen'

export default function InviteClaimRoute() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const resolved = typeof token === 'string' ? token : ''
  return <InviteClaimScreen token={resolved} />
}
