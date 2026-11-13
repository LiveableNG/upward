import type {
  GoalListQuery,
  OfferingListQuery,
  GetUserGoalsQueryDto,
} from '../types/goals.types'

export const goalQueryKeys = {
  all: ['goals'] as const,
  categories: () => ['goal-categories'] as const,
  publicList: (query: GoalListQuery) => ['goals-list', query] as const,
  publicDetail: (identifier: string | number) => ['goal-detail', identifier] as const,
  offerings: (query: OfferingListQuery) => ['goal-offerings', query] as const,
  offeringDetail: (identifier: string | number) => ['goal-offering-detail', identifier] as const,
  userGoals: (userKey: string | number, query?: GetUserGoalsQueryDto) =>
    ['user-goals', String(userKey), query || {}] as const,
  userGoalDetail: (userKey: string | number, identifier: string | number) =>
    ['user-goal-detail', String(userKey), String(identifier)] as const,
  milestones: (userKey: string | number, identifier: string | number) =>
    ['goal-milestones', String(userKey), String(identifier)] as const,
}
