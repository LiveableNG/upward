import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useMyHomeProperties } from '@/features/my-home/hooks/useMyHomeProperties'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { GtTransaction } from '@/features/my-home/types'

export type GtHistoryRow = GtTransaction & {
  propertyUuid: string
  propertyLabel: string
  unitName?: string
}

export function useAllGtTransactions() {
  const properties = useMyHomeProperties()

  const queries = useQueries({
    queries: properties.map((property) => ({
      queryKey: ['my-home', 'transactions', 'history', property.uuid],
      queryFn: () => myHomeService.getTransactions(property.uuid, 1),
      enabled: !!property.uuid,
      staleTime: 60_000,
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

  const isLoading = properties.length > 0 && queries.some((q) => q.isPending)

  return { transactions, isLoading, refetchKeys: properties.map((p) => p.uuid) }
}
