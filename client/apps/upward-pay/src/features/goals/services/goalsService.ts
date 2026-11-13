import { request } from '@/lib/api-client'
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
  DeliveryZoneConfig,
  PaginationMeta,
} from '../types/goals.types'

/**
 * Public Goals Discovery & Catalog
 */
export async function fetchGoalCategories(): Promise<GoalCategory[]> {
  const res = await request<{ data: GoalCategory[] }>('/public/goals/categories', {
    method: 'GET',
  })
  return res.data || []
}

export async function fetchGoalsList(
  query: GoalListQuery = {},
): Promise<{ data: Goal[]; meta: PaginationMeta }> {
  const params = new URLSearchParams()
  if (query.categoryId !== undefined) params.set('categoryId', String(query.categoryId))
  if (query.status) params.set('status', query.status)
  if (query.skip !== undefined) params.set('skip', String(query.skip))
  if (query.take !== undefined) params.set('take', String(query.take))
  if (query.search) params.set('search', query.search)

  const qs = params.toString()
  const url = `/public/goals/list${qs ? `?${qs}` : ''}`
  const res = await request<{ data: Goal[]; meta: PaginationMeta }>(url, {
    method: 'GET',
  })
  return {
    data: res.data || [],
    meta: res.meta || { total: 0, skip: 0, take: query.take || 20 },
  }
}

export async function fetchGoalDetail(identifier: string | number): Promise<Goal> {
  const res = await request<{ data: Goal }>(`/public/goals/detail/${identifier}`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchGoalOfferings(
  query: OfferingListQuery = {},
): Promise<{ data: GoalOffering[]; meta: PaginationMeta }> {
  const params = new URLSearchParams()
  if (query.goalId !== undefined) params.set('goalId', String(query.goalId))
  if (query.type) params.set('type', query.type)
  if (query.status) params.set('status', query.status)
  if (query.vendorId !== undefined) params.set('vendorId', String(query.vendorId))
  if (query.isFeatured !== undefined) params.set('isFeatured', String(query.isFeatured))
  if (query.minPrice !== undefined) params.set('minPrice', String(query.minPrice))
  if (query.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice))
  if (query.skip !== undefined) params.set('skip', String(query.skip))
  if (query.take !== undefined) params.set('take', String(query.take))
  if (query.search) params.set('search', query.search)

  const qs = params.toString()
  const url = `/public/goals/offerings${qs ? `?${qs}` : ''}`
  const res = await request<{ data: GoalOffering[]; meta: PaginationMeta }>(url, {
    method: 'GET',
  })
  return {
    data: res.data || [],
    meta: res.meta || { total: 0, skip: 0, take: query.take || 20 },
  }
}

export async function fetchGoalOfferingDetail(
  identifier: string | number,
): Promise<GoalOffering> {
  const res = await request<{ data: GoalOffering }>(
    `/public/goals/offerings/${identifier}`,
    {
      method: 'GET',
    },
  )
  return res.data
}

export async function fetchDeliveryZones(): Promise<DeliveryZoneConfig[]> {
  try {
    const res = await request<{ data: DeliveryZoneConfig[] }>('/public/goals/delivery-zones', {
      method: 'GET',
    })
    return res.data || []
  } catch (err) {
    console.warn('Failed to fetch dynamic delivery zones from server', err)
    return []
  }
}

/**
 * Authenticated User Goals
 */

export async function fetchUserGoals(
  query: GetUserGoalsQueryDto = {},
): Promise<{ data: UserGoal[]; meta?: PaginationMeta }> {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.includeArchived !== undefined) params.set('includeArchived', String(query.includeArchived))
  if (query.categoryId !== undefined) params.set('categoryId', String(query.categoryId))
  if (query.categorySlug) params.set('categorySlug', query.categorySlug)
  if (query.skip !== undefined) params.set('skip', String(query.skip))
  if (query.take !== undefined) params.set('take', String(query.take))

  const qs = params.toString()
  const url = `/user/goals${qs ? `?${qs}` : ''}`
  const res = await request<{ data: UserGoal[]; meta?: PaginationMeta }>(url, {
    method: 'GET',
  })
  return {
    data: res.data || [],
    meta: res.meta,
  }
}

export async function fetchUserGoalDetail(identifier: string | number): Promise<UserGoal> {
  const res = await request<{ data: UserGoal }>(`/user/goals/${identifier}`, {
    method: 'GET',
  })
  return res.data
}

export async function adoptCatalogueGoal(dto: AdoptCatalogueGoalDto): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>('/user/goals/adopt', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
  return res.data
}

export async function createCustomGoal(dto: CreateCustomGoalDto): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>('/user/goals/custom', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
  return res.data
}

/**
 * Backward compatibility: set active user goals as a batch
 */
export async function setUserGoals(data: SetUserGoalsData): Promise<UserGoal[]> {
  const res = await request<{ data: UserGoal[]; message: string }>('/user/goals/set', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data || []
}

export async function updateUserGoal(
  identifier: string | number,
  data: UpdateUserGoalData,
): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${identifier}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function activateGoal(identifier: string | number): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${identifier}/activate`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function pauseGoal(identifier: string | number): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${identifier}/pause`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function completeGoal(identifier: string | number): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${identifier}/complete`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function archiveGoal(identifier: string | number): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${identifier}/archive`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function removeUserGoal(
  identifier: string | number,
): Promise<{ success: boolean; message: string }> {
  const res = await request<{ success: boolean; message: string }>(
    `/user/goals/${identifier}`,
    {
      method: 'DELETE',
    },
  )
  return res
}

/**
 * Goal Milestones
 */

export async function fetchGoalMilestones(
  identifier: string | number,
): Promise<GoalMilestone[]> {
  const res = await request<{ data: GoalMilestone[] }>(
    `/user/goals/${identifier}/milestones`,
    {
      method: 'GET',
    },
  )
  return res.data || []
}

export async function createGoalMilestone(
  identifier: string | number,
  dto: CreateGoalMilestoneDto,
): Promise<GoalMilestone> {
  const res = await request<{ data: GoalMilestone; message: string }>(
    `/user/goals/${identifier}/milestones`,
    {
      method: 'POST',
      body: JSON.stringify(dto),
    },
  )
  return res.data
}

export async function updateGoalMilestone(
  identifier: string | number,
  milestoneId: string | number,
  dto: UpdateGoalMilestoneDto,
): Promise<GoalMilestone> {
  const res = await request<{ data: GoalMilestone; message: string }>(
    `/user/goals/${identifier}/milestones/${milestoneId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(dto),
    },
  )
  return res.data
}

export async function toggleGoalMilestoneStatus(
  identifier: string | number,
  milestoneId: string | number,
): Promise<GoalMilestone> {
  const res = await request<{ data: GoalMilestone; message: string }>(
    `/user/goals/${identifier}/milestones/${milestoneId}/toggle`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function deleteGoalMilestone(
  identifier: string | number,
  milestoneId: string | number,
): Promise<{ success: boolean; message: string }> {
  const res = await request<{ success: boolean; message: string }>(
    `/user/goals/${identifier}/milestones/${milestoneId}`,
    {
      method: 'DELETE',
    },
  )
  return res
}
