import { useEffect } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  fetchGoalCategories,
  fetchGoalsList,
  fetchGoalDetail,
  fetchGoalOfferings,
  fetchGoalOfferingDetail,
  fetchUserGoals,
  fetchUserGoalDetail,
  adoptCatalogueGoal,
  createCustomGoal,
  setUserGoals,
  updateUserGoal,
  activateGoal,
  pauseGoal,
  completeGoal,
  archiveGoal,
  removeUserGoal,
  fetchGoalMilestones,
  createGoalMilestone,
  updateGoalMilestone,
  toggleGoalMilestoneStatus,
  deleteGoalMilestone,
} from '../services/goalsService'
import {
  getCachedUserGoals,
  setCachedUserGoals,
} from '../utils/goalCache'
import type {
  GoalCategory,
  Goal,
  GoalOffering,
  UserGoal,
  GoalMilestone,
  GoalListQuery,
  OfferingListQuery,
  SetUserGoalsData,
  AdoptCatalogueGoalDto,
  CreateCustomGoalDto,
  UpdateUserGoalData,
  GetUserGoalsQueryDto,
  CreateGoalMilestoneDto,
  UpdateGoalMilestoneDto,
  PaginationMeta,
} from '../types/goals.types'

import { goalQueryKeys } from '../utils/goalQueryKeys'
export { goalQueryKeys } from '../utils/goalQueryKeys'

/**
 * Public Goals & Categories Hooks
 */
export function useGoalCategories(): UseQueryResult<GoalCategory[], Error> {
  return useQuery({
    queryKey: goalQueryKeys.categories(),
    queryFn: async () => {
      try {
        return await fetchGoalCategories()
      } catch {
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export function useGoalsList(
  query: GoalListQuery = {},
): UseQueryResult<{ data: Goal[]; meta: PaginationMeta }, Error> {
  return useQuery({
    queryKey: goalQueryKeys.publicList(query),
    queryFn: () => fetchGoalsList(query),
    staleTime: 2 * 60 * 1000,
  })
}

export function useGoalDetail(
  identifier: string | number | undefined,
): UseQueryResult<Goal, Error> {
  return useQuery({
    queryKey: identifier ? goalQueryKeys.publicDetail(identifier) : ['goal-detail', 'undefined'],
    queryFn: () => fetchGoalDetail(identifier!),
    enabled: !!identifier,
    staleTime: 2 * 60 * 1000,
  })
}

export function useGoalOfferings(
  query: OfferingListQuery = {},
): UseQueryResult<{ data: GoalOffering[]; meta: PaginationMeta }, Error> {
  return useQuery({
    queryKey: goalQueryKeys.offerings(query),
    queryFn: () => fetchGoalOfferings(query),
    staleTime: 2 * 60 * 1000,
  })
}

export function usePublicOfferings(
  query: OfferingListQuery = {},
): UseQueryResult<GoalOffering[], Error> {
  return useQuery({
    queryKey: ['public-offerings', query],
    queryFn: async () => {
      const res = await fetchGoalOfferings(query)
      return res.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useGoalOfferingDetail(
  identifier: string | number | undefined,
): UseQueryResult<GoalOffering, Error> {
  return useQuery({
    queryKey: identifier ? goalQueryKeys.offeringDetail(identifier) : ['goal-offering-detail', 'undefined'],
    queryFn: () => fetchGoalOfferingDetail(identifier!),
    enabled: !!identifier,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Authenticated User Goals Hooks
 */

export interface UseUserGoalsOptions {
  enabled?: boolean
}

/**
 * Retrieves the current user's goals. Backward compatible with both:
 * useUserGoals({ enabled: boolean }) and useUserGoals(query, options)
 */
export function useUserGoals(
  queryOrOptions?: GetUserGoalsQueryDto | UseUserGoalsOptions,
  maybeOptions?: UseUserGoalsOptions,
): UseQueryResult<UserGoal[], Error> {
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  const isLegacyOptionObj =
    queryOrOptions &&
    'enabled' in queryOrOptions &&
    !('status' in queryOrOptions || 'categoryId' in queryOrOptions || 'includeArchived' in queryOrOptions)

  const query: GetUserGoalsQueryDto = isLegacyOptionObj
    ? {}
    : ((queryOrOptions as GetUserGoalsQueryDto) || {})
  const options: UseUserGoalsOptions = isLegacyOptionObj
    ? (queryOrOptions as UseUserGoalsOptions)
    : (maybeOptions || {})

  const isEnabled = options.enabled !== undefined ? options.enabled : !!user?.uuid

  const userGoalsQuery = useQuery({
    queryKey: goalQueryKeys.userGoals(userKey, query),
    queryFn: async () => {
      try {
        const result = await fetchUserGoals(query)
        return result.data || []
      } catch {
        return []
      }
    },
    enabled: isEnabled,
    staleTime: 30 * 1000,
    retry: 1,
    initialData: () => {
      // Seed from offline cache if unparameterized
      if (!query.status && !query.categoryId) {
        const cached = getCachedUserGoals(user?.id)
        return cached ?? undefined
      }
      return undefined
    },
    initialDataUpdatedAt: 0,
  })

  // Synchronize server data to local offline cache
  useEffect(() => {
    if (userGoalsQuery.data && user?.id && !query.status && !query.categoryId) {
      setCachedUserGoals(user.id, userGoalsQuery.data)
    }
  }, [userGoalsQuery.data, user?.id, query.status, query.categoryId])

  return userGoalsQuery
}

export function useUserGoalDetail(
  identifier: string | number | undefined,
): UseQueryResult<UserGoal, Error> {
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useQuery({
    queryKey: identifier
      ? goalQueryKeys.userGoalDetail(userKey, identifier)
      : ['user-goal-detail', 'undefined'],
    queryFn: () => fetchUserGoalDetail(identifier!),
    enabled: !!identifier && !!user?.uuid,
    staleTime: 30 * 1000,
  })
}

/**
 * Goal Creation Mutations
 */

export function useAdoptCatalogueGoal(): UseMutationResult<UserGoal, Error, AdoptCatalogueGoalDto> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (dto: AdoptCatalogueGoalDto) => adoptCatalogueGoal(dto),
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, newGoal.uuid || newGoal.id),
        newGoal,
      )
    },
  })
}

export function useCreateCustomGoal(): UseMutationResult<UserGoal, Error, CreateCustomGoalDto> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (dto: CreateCustomGoalDto) => createCustomGoal(dto),
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, newGoal.uuid || newGoal.id),
        newGoal,
      )
    },
  })
}

export function useSetUserGoals(): UseMutationResult<UserGoal[], Error, SetUserGoalsData> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (data: SetUserGoalsData) => setUserGoals(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      if (user?.id) {
        setCachedUserGoals(user.id, data)
      }
    },
  })
}

export function useUpdateUserGoal(): UseMutationResult<
  UserGoal,
  Error,
  { goalId: string | number; data: UpdateUserGoalData }
> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string | number; data: UpdateUserGoalData }) =>
      updateUserGoal(goalId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, updated.uuid || updated.id),
        updated,
      )
    },
  })
}

/**
 * Goal Lifecycle Mutations
 */

export function useActivateGoal(): UseMutationResult<UserGoal, Error, string | number> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (identifier: string | number) => activateGoal(identifier),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, updated.uuid || updated.id),
        updated,
      )
    },
  })
}

export function usePauseGoal(): UseMutationResult<UserGoal, Error, string | number> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (identifier: string | number) => pauseGoal(identifier),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, updated.uuid || updated.id),
        updated,
      )
    },
  })
}

export function useCompleteGoal(): UseMutationResult<UserGoal, Error, string | number> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (identifier: string | number) => completeGoal(identifier),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, updated.uuid || updated.id),
        updated,
      )
    },
  })
}

export function useArchiveGoal(): UseMutationResult<UserGoal, Error, string | number> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (identifier: string | number) => archiveGoal(identifier),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
      queryClient.setQueryData(
        goalQueryKeys.userGoalDetail(userKey, updated.uuid || updated.id),
        updated,
      )
    },
  })
}

export function useRemoveUserGoal(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  string | number
> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: (identifier: string | number) => removeUserGoal(identifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
    },
  })
}

/**
 * Milestone Hooks & Mutations
 */

export function useGoalMilestones(
  identifier: string | number | undefined,
): UseQueryResult<GoalMilestone[], Error> {
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useQuery({
    queryKey: identifier
      ? goalQueryKeys.milestones(userKey, identifier)
      : ['goal-milestones', 'undefined'],
    queryFn: () => fetchGoalMilestones(identifier!),
    enabled: !!identifier && !!user?.uuid,
    staleTime: 30 * 1000,
  })
}

export function useCreateGoalMilestone(): UseMutationResult<
  GoalMilestone,
  Error,
  { goalIdentifier: string | number; dto: CreateGoalMilestoneDto }
> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: ({ goalIdentifier, dto }) => createGoalMilestone(goalIdentifier, dto),
    onSuccess: (_milestone, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.milestones(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.userGoalDetail(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
    },
  })
}

export function useUpdateGoalMilestone(): UseMutationResult<
  GoalMilestone,
  Error,
  { goalIdentifier: string | number; milestoneId: string | number; dto: UpdateGoalMilestoneDto }
> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: ({ goalIdentifier, milestoneId, dto }) =>
      updateGoalMilestone(goalIdentifier, milestoneId, dto),
    onSuccess: (_milestone, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.milestones(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.userGoalDetail(userKey, variables.goalIdentifier),
      })
    },
  })
}

export function useToggleGoalMilestone(): UseMutationResult<
  GoalMilestone,
  Error,
  { goalIdentifier: string | number; milestoneId: string | number }
> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: ({ goalIdentifier, milestoneId }) =>
      toggleGoalMilestoneStatus(goalIdentifier, milestoneId),
    onSuccess: (_milestone, variables) => {
      // Toggle updates milestone and triggers server-side progress calculation on the parent goal
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.milestones(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.userGoalDetail(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
    },
  })
}

export function useDeleteGoalMilestone(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  { goalIdentifier: string | number; milestoneId: string | number }
> {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.uuid || user?.id || 'anonymous'

  return useMutation({
    mutationFn: ({ goalIdentifier, milestoneId }) =>
      deleteGoalMilestone(goalIdentifier, milestoneId),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.milestones(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({
        queryKey: goalQueryKeys.userGoalDetail(userKey, variables.goalIdentifier),
      })
      queryClient.invalidateQueries({ queryKey: ['user-goals', String(userKey)] })
    },
  })
}
