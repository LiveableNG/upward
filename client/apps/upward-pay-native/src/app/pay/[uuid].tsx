import { useLocalSearchParams } from 'expo-router'

import { GuestPayScreen } from '@/features/payments/screens/GuestPayScreen'

export default function PublicPayRoute() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const paymentUuid = typeof uuid === 'string' ? uuid : ''
  return <GuestPayScreen paymentUuid={paymentUuid} />
}
