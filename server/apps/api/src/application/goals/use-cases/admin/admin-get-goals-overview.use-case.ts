import { Inject, Injectable } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  GoalsOverviewStats,
} from '../../../../domains/goals/goal.repository'

@Injectable()
export class AdminGetGoalsOverviewUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(): Promise<GoalsOverviewStats> {
    return this.goalRepo.getGoalsOverview()
  }
}

