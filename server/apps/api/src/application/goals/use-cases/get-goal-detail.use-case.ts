import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { GOAL_REPOSITORY, Goal, GoalRepository } from '../../../domains/goals/goal.repository'

@Injectable()
export class GetGoalDetailUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(identifier: string): Promise<Goal> {
    let goal: Goal | null = null

    // Check if identifier is UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      goal = await this.goalRepo.findGoalByUuid(identifier)
    } else {
      goal = await this.goalRepo.findGoalBySlug(identifier, { includeDetails: true })
    }

    if (!goal) {
      throw new NotFoundException(`Goal '${identifier}' not found`)
    }

    return goal
  }
}
