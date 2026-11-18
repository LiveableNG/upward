'use client'

import { useQuery } from '@tanstack/react-query'
import {
  DEFAULT_PLATFORM_RATES,
  getPlatformRates,
  type PlatformRates,
} from '../services/platformRatesService'

export function usePlatformRates() {
  const query = useQuery<PlatformRates>({
    queryKey: ['platform-rates'],
    queryFn: getPlatformRates,
    staleTime: 15 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  })

  return {
    rates: query.data || DEFAULT_PLATFORM_RATES,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
