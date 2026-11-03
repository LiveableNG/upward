import { Inject, Injectable } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
  UserGoalStatus,
} from '../../../domains/goals/goal.repository'

@Injectable()
export class GetUserGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(userId: number, status?: UserGoalStatus): Promise<UserGoal[]> {
    return this.goalRepo.findUserGoals(userId, status)
  }
}

