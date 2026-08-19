'use client'

import { useMemo } from 'react'
import { useInfiniteQuery, useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import * as myHomeService from '../services/myHomeService'
import type { PanelState, PendingBill, GtTransaction } from '../types'
import type { ComplaintStatusFilter } from '../constants'
import { managerDisplayNameFromProperty, managerEmailFromProperty } from '../utils/propertyContact'

const STALE_TIME = 2 * 60 * 1000

export type MyHomeProperty = {
  uuid: string
  label: string
  unitName?: string
  rentStartDate?: string
  rentEndDate?: string
  managerDisplayName?: string
  managerEmail?: string
}

/**
 * Active tenancies the tenant can open a My Home view for. Past tenancies are
 * excluded — GT has no live unit context for them. Properties without an
 * externalUnitId are excluded too — there is no GT unit to resolve reads
 * against, so the hub would just show "not linked" for every panel.
 */
export function useMyHomeProperties() {
  const { user } = useAuth()

  return useMemo<MyHomeProperty[]>(() => {
    return (user?.properties || [])
      .filter((property) => !property.isPastTenancy && property.uuid && property.externalUnitId)
      .map((property) => {
        const location = property.location
        const label =
          [location?.address, location?.area, location?.state].filter(Boolean).join(', ') ||
          property.address ||
          'Your home'

        return {
          uuid: property.uuid as string,
          label,
          unitName: property.unitName,
          rentStartDate: property.rentStartDate,
          rentEndDate: property.rentEndDate,
          managerDisplayName: managerDisplayNameFromProperty(property),
          managerEmail: managerEmailFromProperty(property),
        }
      })
  }, [user])
}

/** Whether to show the "My Home" nav entry at all. */
export function useHasMyHome() {
  return useMyHomeProperties().length > 0
}

/**
 * Collapses a react-query result into the panel states the hub renders.
 * A 501 from the GT bridge means the read is not built yet, which is a
 * different message to the tenant than a genuine failure.
 */
export function toPanelState<TData, TItem>(
  query: UseQueryResult<TData, unknown>,
  selectItems: (data: TData) => TItem[] | null,
): PanelState<TItem[]> {
  if (query.isPending) return { status: 'loading' }

  if (query.isError) {
    const error = query.error as { status?: number; message?: string } | undefined

    if (error?.status === 501) {
      return { status: 'unavailable', message: 'Not available yet' }
    }
    if (error?.status === 404) {
      return { status: 'unavailable', message: 'This home is not linked to your building yet' }
    }
    return { status: 'error', message: error?.message || 'Could not load' }
  }

  const items = query.data ? selectItems(query.data) : null
  if (!items || items.length === 0) return { status: 'empty' }

  return { status: 'ready', data: items }
}

export function useComplaints(propertyUuid: string | null) {
  return useQuery({
    queryKey: ['my-home', 'complaints', propertyUuid],
    queryFn: () => myHomeService.getComplaints(propertyUuid as string, 1),
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useComplaintsInfinite(
  propertyUuid: string | null,
  status: ComplaintStatusFilter = 'pending',
) {
  return useInfiniteQuery({
    queryKey: ['my-home', 'complaints', 'infinite', propertyUuid, status],
    queryFn: ({ pageParam }) =>
      myHomeService.getComplaints(propertyUuid as string, pageParam, status),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta
      if (!meta || meta.current_page >= meta.last_page) return undefined
      return meta.current_page + 1
    },
    enabled: !!propertyUuid,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}

export function useComplaintDetail(propertyUuid: string | null, complaintId: string | null) {
  return useQuery({
    queryKey: ['my-home', 'complaint', propertyUuid, complaintId],
    queryFn: () => myHomeService.getComplaint(propertyUuid as string, complaintId as string),
    enabled: !!propertyUuid && !!complaintId,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useActiveVisitors(propertyUuid: string | null) {
  return useQuery({
    queryKey: ['my-home', 'visitors', 'active', propertyUuid],
    queryFn: () => myHomeService.getActiveVisitors(propertyUuid as string),
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useVisitorHistoryInfinite(propertyUuid: string | null) {
  return useInfiniteQuery({
    queryKey: ['my-home', 'visitors', 'history', 'infinite', propertyUuid],
    queryFn: ({ pageParam }) => myHomeService.getVisitorHistory(propertyUuid as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta
      if (!meta || meta.current_page >= meta.last_page) return undefined
      return meta.current_page + 1
    },
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function usePendingBills(propertyUuid: string | null) {
  return useQuery({
    queryKey: ['my-home', 'transactions', 'pending', propertyUuid],
    queryFn: () => myHomeService.getPendingBills(propertyUuid as string),
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export type GtActivityBill = PendingBill & {
  propertyUuid: string
  propertyLabel: string
  unitName?: string
}

/** Pending GT bills across every linked My Home property — for dashboard alerts. */
export function useAllPendingBills() {
  const properties = useMyHomeProperties()

  const queries = useQueries({
    queries: properties.map((property) => ({
      queryKey: ['my-home', 'transactions', 'pending', property.uuid],
      queryFn: () => myHomeService.getPendingBills(property.uuid),
      enabled: !!property.uuid,
      staleTime: STALE_TIME,
      retry: false,
    })),
  })

  const bills = useMemo(() => {
    const result: GtActivityBill[] = []

    properties.forEach((property, index) => {
      const rows = queries[index]?.data?.data ?? []
      for (const bill of rows) {
        result.push({
          ...bill,
          propertyUuid: property.uuid,
          propertyLabel: property.label,
          unitName: property.unitName,
        })
      }
    })

    return result
  }, [properties, queries])

  const isLoading = properties.length > 0 && queries.some((query) => query.isPending)

  return { bills, isLoading }
}

export type GtHistoryRow = GtTransaction & {
  propertyUuid: string
  propertyLabel: string
  unitName?: string
}

/** GT transaction history across every linked My Home property. */
export function useAllGtTransactions() {
  const properties = useMyHomeProperties()

  const queries = useQueries({
    queries: properties.map((property) => ({
      queryKey: ['my-home', 'transactions', 'history', property.uuid],
      queryFn: () => myHomeService.getTransactions(property.uuid, 1),
      enabled: !!property.uuid,
      staleTime: STALE_TIME,
      retry: false,
    })),
  })

  const transactions = useMemo(() => {
    const result: GtHistoryRow[] = []

    properties.forEach((property, index) => {
      const grouped = queries[index]?.data?.data ?? {}
      for (const rows of Object.values(grouped)) {
        for (const row of rows) {
          result.push({
            ...row,
            propertyUuid: property.uuid,
            propertyLabel: property.label,
            unitName: property.unitName,
          })
        }
      }
    })

    return result
  }, [properties, queries])

  const isLoading = properties.length > 0 && queries.some((query) => query.isPending)

  return { transactions, isLoading }
}

export function useTransactionsInfinite(propertyUuid: string | null) {
  return useInfiniteQuery({
    queryKey: ['my-home', 'transactions', 'history', 'infinite', propertyUuid],
    queryFn: ({ pageParam }) => myHomeService.getTransactions(propertyUuid as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta
      if (!meta || meta.current_page >= meta.last_page) return undefined
      return meta.current_page + 1
    },
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useDocuments(propertyUuid: string | null) {
  return useQuery({
    queryKey: ['my-home', 'documents', propertyUuid],
    queryFn: () => myHomeService.getDocuments(propertyUuid as string, 1),
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useDocumentsInfinite(propertyUuid: string | null) {
  return useInfiniteQuery({
    queryKey: ['my-home', 'documents', 'infinite', propertyUuid],
    queryFn: ({ pageParam }) => myHomeService.getDocuments(propertyUuid as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta
      if (!meta || meta.current_page >= meta.last_page) return undefined
      return meta.current_page + 1
    },
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useCoTenants(propertyUuid: string | null) {
  return useQuery({
    queryKey: ['my-home', 'co-tenants', propertyUuid],
    queryFn: () => myHomeService.getCoTenants(propertyUuid as string),
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}

export function useLastInspection(propertyUuid: string | null) {
  return useQuery({
    queryKey: ['my-home', 'inspection', 'last-result', propertyUuid],
    queryFn: () => myHomeService.getLastInspectionResult(propertyUuid as string),
    enabled: !!propertyUuid,
    staleTime: STALE_TIME,
    retry: false,
  })
}
