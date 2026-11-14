import { request } from '@/lib/api-client'
import type {
  GoalCategory,
  Goal,
  GoalOffering,
  UserGoal,
  GoalListQuery,
  OfferingListQuery,
  SetUserGoalsData,
  UpdateUserGoalData,
  CreateCustomGoalInput,
  SubmitQuestionnaireInput,
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

/**
 * Authenticated User Goals
 */
export async function fetchUserGoals(): Promise<UserGoal[]> {
  const res = await request<{ data: UserGoal[] }>('/user/goals', {
    method: 'GET',
  })
  return res.data || []
}

export async function setUserGoals(data: SetUserGoalsData): Promise<UserGoal[]> {
  const res = await request<{ data: UserGoal[]; message: string }>('/user/goals/set', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data || []
}

export async function updateUserGoal(
  goalId: number,
  data: UpdateUserGoalData,
): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${goalId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function removeUserGoal(
  identifier: number | string,
): Promise<{ success: boolean; message: string }> {
  const res = await request<{ success: boolean; message: string }>(
    `/user/goals/${identifier}`,
    {
      method: 'DELETE',
    },
  )
  return res
}

export async function createCustomGoal(
  data: CreateCustomGoalInput,
): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    '/user/goals/custom',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function submitGoalQuestionnaire(
  data: SubmitQuestionnaireInput,
): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    '/user/goals/questionnaire',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function toggleGoalAction(
  goalUuid: string,
  actionId: string,
): Promise<UserGoal> {
  const res = await request<{ data: UserGoal; message: string }>(
    `/user/goals/${goalUuid}/actions/${actionId}/toggle`,
    {
      method: 'PATCH',
    },
  )
  return res.data
}

export interface DeliveryZoneConfig {
  id?: number
  uuid: string
  tag: string
  name: string
  state: string
  region?: string | null
  areasCovered?: string | null
  isDelivering: boolean
  deliveryFeeKobo: string
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder: number
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
