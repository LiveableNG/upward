'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../services/dashboardService'
import { type DashboardData } from '../types'

interface UseDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string
  reload: () => void
}

export function useDashboard(): UseDashboardReturn {
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
  })

  return {
    data: data || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : '',
    reload: () => refetch(),
  }
}
