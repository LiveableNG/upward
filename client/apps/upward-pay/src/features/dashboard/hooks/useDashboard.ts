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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function usePendingPayments() {
  return useQuery({
    queryKey: ['pendingPayments'],
    queryFn: getPendingPaymentsParsed,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactionsParsed,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useSavedLandlords() {
  return useQuery({
    queryKey: ['savedLandlords'],
    queryFn: getSavedLandlordsParsed,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  return {
    data: data || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : '',
    reload: () => refetch(),
  }
}

