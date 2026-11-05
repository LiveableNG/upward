import { Inject, Injectable, BadRequestException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
} from '../../../domains/goals/goal.repository'

@Injectable()
export class SetUserGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(userId: number | string, goalIds: number[]): Promise<UserGoal[]> {
    if (!Array.isArray(goalIds)) {
      throw new BadRequestException('Goal IDs must be provided as an array')
    }

    return this.goalRepo.setUserGoals(userId, goalIds)
  }
}

