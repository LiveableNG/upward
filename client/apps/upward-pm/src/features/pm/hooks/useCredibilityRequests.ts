import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCredibilityRequests() {
  return useQuery({
    queryKey: ['credibility-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/credibility-requests')
      return res as any[]
    },
  })
}
