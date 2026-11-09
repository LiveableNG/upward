import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  fetchGoalCategories,
  fetchGoalsList,
  fetchGoalDetail,
  fetchGoalOfferings,
  fetchGoalOfferingDetail,
  fetchUserGoals,
  setUserGoals,
  updateUserGoal,
  removeUserGoal,
} from '../services/goalsService'
import { getCachedUserGoals, setCachedUserGoals } from '../utils/goalCache'
import type {
  GoalCategory,
  Goal,
  GoalOffering,
  UserGoal,
  GoalListQuery,
  OfferingListQuery,
  SetUserGoalsData,
  UpdateUserGoalData,
  PaginationMeta,
} from '../types/goals.types'

/**
 * Public Goals & Categories Hooks
 */
export function useGoalCategories(): UseQueryResult<GoalCategory[], Error> {
  return useQuery({
    queryKey: ['goal-categories'],
    queryFn: fetchGoalCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useGoalsList(
  query: GoalListQuery = {},
): UseQueryResult<{ data: Goal[]; meta: PaginationMeta }, Error> {
  return useQuery({
    queryKey: ['goals', query],
    queryFn: () => fetchGoalsList(query),
    staleTime: 2 * 60 * 1000,
  })
}

export function useGoalDetail(
  identifier: string | number | undefined,
): UseQueryResult<Goal, Error> {
  return useQuery({
    queryKey: ['goal-detail', identifier],
    queryFn: () => fetchGoalDetail(identifier!),
    enabled: !!identifier,
    staleTime: 2 * 60 * 1000,
  })
}

export function useGoalOfferings(
  query: OfferingListQuery = {},
): UseQueryResult<{ data: GoalOffering[]; meta: PaginationMeta }, Error> {
  return useQuery({
    queryKey: ['goal-offerings', query],
    queryFn: () => fetchGoalOfferings(query),
    staleTime: 2 * 60 * 1000,
  })
}

export function usePublicOfferings(
  query: OfferingListQuery = {},
): UseQueryResult<GoalOffering[], Error> {
  const offeringsQuery = useQuery({
    queryKey: ['public-offerings', query],
    queryFn: async () => {
      const res = await fetchGoalOfferings(query)
      return res.data
    },
    staleTime: 2 * 60 * 1000,
  })
  return offeringsQuery
}

export function useGoalOfferingDetail(
  identifier: string | number | undefined,
): UseQueryResult<GoalOffering, Error> {
  return useQuery({
    queryKey: ['goal-offering-detail', identifier],
    queryFn: () => fetchGoalOfferingDetail(identifier!),
    enabled: !!identifier,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Authenticated User Goals Hooks
 */
export function useUserGoals(options: { enabled?: boolean } = {}) {
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'
  const isEnabled = options.enabled !== undefined ? options.enabled : !!user?.uuid

  const query = useQuery({
    queryKey: ['user-goals', userKey],
    queryFn: async () => {
      const data = await fetchUserGoals()
      return data
    },
    enabled: isEnabled,
    staleTime: 30 * 1000, // 30 seconds
    initialData: () => {
      const cached = getCachedUserGoals(user?.id)
      return cached ?? undefined
    },
    initialDataUpdatedAt: 0, // Treats initialData as stale so it immediately validates in background
  })

  // Synchronize server-confirmed goals to local storage for offline continuity
  useEffect(() => {
    if (query.data && user?.id) {
      setCachedUserGoals(user.id, query.data)
    }
  }, [query.data, user?.id])

  return query
}

export function useSetUserGoals() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (data: SetUserGoalsData) => setUserGoals(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-goals'] })
      const previous = queryClient.getQueryData<UserGoal[]>(['user-goals', userKey])
      return { previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-goals', userKey], context.previous)
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-goals', userKey], data)
      if (user?.id) {
        setCachedUserGoals(user.id, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] })
    },
  })
}

export function useUpdateUserGoal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: number; data: UpdateUserGoalData }) =>
      updateUserGoal(goalId, data),
    onMutate: async ({ goalId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['user-goals'] })
      const previous = queryClient.getQueryData<UserGoal[]>(['user-goals', userKey])

      if (previous) {
        const optimistic = previous.map((ug) =>
          ug.goalId === goalId
            ? {
                ...ug,
                ...data,
                progressPct: data.progressPct !== undefined ? data.progressPct : ug.progressPct,
                status: data.status || ug.status,
                updatedAt: new Date().toISOString(),
              }
            : ug,
        )
        queryClient.setQueryData(['user-goals', userKey], optimistic)
      }

      return { previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-goals', userKey], context.previous)
      }
    },
    onSuccess: (updated) => {
      const current = queryClient.getQueryData<UserGoal[]>(['user-goals', userKey])
      if (current) {
        const next = current.map((ug) => (ug.id === updated.id ? updated : ug))
        queryClient.setQueryData(['user-goals', userKey], next)
        if (user?.id) {
          setCachedUserGoals(user.id, next)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] })
    },
  })
}

export function useRemoveUserGoal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (goalId: number) => removeUserGoal(goalId),
    onMutate: async (goalId: number) => {
      await queryClient.cancelQueries({ queryKey: ['user-goals'] })
      const previous = queryClient.getQueryData<UserGoal[]>(['user-goals', userKey])

      if (previous) {
        const optimistic = previous.filter((ug) => ug.goalId !== goalId)
        queryClient.setQueryData(['user-goals', userKey], optimistic)
      }

      return { previous }
    },
    onError: (_err, _goalId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-goals', userKey], context.previous)
      }
    },
    onSuccess: (_res, goalId) => {
      const current = queryClient.getQueryData<UserGoal[]>(['user-goals', userKey])
      if (current) {
        const next = current.filter((ug) => ug.goalId !== goalId)
        queryClient.setQueryData(['user-goals', userKey], next)
        if (user?.id) {
          setCachedUserGoals(user.id, next)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] })
    },
  })
}
