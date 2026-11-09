import { Inject, Injectable } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalCategory,
  GoalPublishStatus,
  GoalRepository,
} from '../../../domains/goals/goal.repository'

@Injectable()
export class GetGoalCategoriesUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(options?: { status?: GoalPublishStatus; includeGoals?: boolean }): Promise<GoalCategory[]> {
    const status = options?.status ?? 'PUBLISHED'
    return this.goalRepo.findCategories({
      status: status as GoalPublishStatus,
      includeGoals: options?.includeGoals ?? false,
    })
  }
}

