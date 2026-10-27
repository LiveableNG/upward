import { useLocalSearchParams } from 'expo-router'

import { ExclusiveHomeDetailScreen } from '@/features/alliance/screens/ExclusiveHomeDetailScreen'

export default function ExclusiveHomeDetailRoute() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const listingUuid = typeof uuid === 'string' ? uuid : ''
  return <ExclusiveHomeDetailScreen listingUuid={listingUuid} />
}
