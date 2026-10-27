import { useInfiniteQuery } from '@tanstack/react-query'

import type { ComplaintStatusFilter } from '@/features/my-home/constants'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import { parseComplaintListPage } from '@/features/my-home/utils/complaintList'

export function useComplaintsInfinite(
  propertyUuid: string | null,
  status: ComplaintStatusFilter = 'pending',
) {
  return useInfiniteQuery({
    queryKey: ['my-home', 'complaints', 'infinite', propertyUuid, status],
    enabled: !!propertyUuid,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      myHomeService.getComplaints(propertyUuid!, pageParam, status).then(parseComplaintListPage),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta
      if (!meta || meta.current_page >= meta.last_page) return undefined
      return meta.current_page + 1
    },
    retry: false,
  })
}
