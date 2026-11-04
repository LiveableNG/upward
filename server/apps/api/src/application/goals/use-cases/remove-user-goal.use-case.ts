import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../domains/goals/goal.repository'

@Injectable()
export class RemoveUserGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(userId: number | string, goalId: number): Promise<void> {
    const existing = await this.goalRepo.findUserGoal(userId, goalId)
    if (!existing) {
      throw new NotFoundException('User goal record not found')
    }

    await this.goalRepo.removeUserGoal(userId, goalId)
  }
}
