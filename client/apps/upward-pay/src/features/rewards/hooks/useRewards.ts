import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchUserRewardsSummary,
  completeRewardActivity,
} from '../services/rewardsService'

export function useUserRewardsSummary(enabled = true) {
  return useQuery({
    queryKey: ['user-rewards-summary'],
    queryFn: () => fetchUserRewardsSummary(),
    enabled,
    staleTime: 20 * 1000,
  })
}

export function useCompleteRewardActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: completeRewardActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rewards-summary'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['rent-vault'] })
    },
  })
}
