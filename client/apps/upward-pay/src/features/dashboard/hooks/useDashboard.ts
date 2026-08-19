'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardData,
  getPendingPaymentsParsed,
  getTransactionsParsed,
  getSavedLandlordsParsed,
} from '../services/dashboardService'
import { api } from '@/lib/api'
import { type DashboardData } from '../types'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  })
}

export function usePendingPayments() {
  return useQuery({
    queryKey: ['pendingPayments'],
    queryFn: getPendingPaymentsParsed,
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactionsParsed,
  })
}

export function useSavedLandlords() {
  return useQuery({
    queryKey: ['savedLandlords'],
    queryFn: getSavedLandlordsParsed,
  })
}

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

