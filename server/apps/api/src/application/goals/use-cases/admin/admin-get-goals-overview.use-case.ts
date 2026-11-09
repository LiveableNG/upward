import { Inject, Injectable } from '@nestjs/common'
import { GOAL_REPOSITORY, GoalRepository } from '../../../../domains/goals/goal.repository'

@Injectable()
export class AdminGetGoalsOverviewUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(): Promise<{
    totalCategories: number
    totalGoals: number
    totalActiveUserGoals: number
    topGoals: Array<{ goalId: number; title: string; count: number }>
  }> {
    return this.goalRepo.getGoalsOverview()
  }
}
