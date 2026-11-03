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

  async execute(userId: number, goalIds: number[]): Promise<UserGoal[]> {
    if (!Array.isArray(goalIds) || goalIds.length === 0) {
      throw new BadRequestException('At least one goal must be provided')
    }

    return this.goalRepo.setUserGoals(userId, goalIds)
  }
}

