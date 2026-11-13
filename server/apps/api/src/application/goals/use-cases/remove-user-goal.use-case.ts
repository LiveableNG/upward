import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { resolveUserId } from './user-resolver.helper'

@Injectable()
export class RemoveUserGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(
    userIdentifier: number | string,
    goalIdentifier: string | number,
  ): Promise<void> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    let existing: UserGoal | null = null
    const numericId = Number(goalIdentifier)

    if (!isNaN(numericId) && Number.isInteger(numericId)) {
      if (typeof this.goalRepo.findUserGoalById === 'function') {
        existing = await this.goalRepo.findUserGoalById(numericId)
      }
      if (!existing || existing.userId !== userId) {
        const byCatalogue = await this.goalRepo.findUserGoal(userId, numericId)
        if (byCatalogue) existing = byCatalogue
      }
    } else if (typeof this.goalRepo.findUserGoalByUuid === 'function') {
      existing = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    // Non-destructive soft archive
    if (typeof this.goalRepo.archiveUserGoal === 'function') {
      await this.goalRepo.archiveUserGoal(existing.id!)
    } else {
      await this.goalRepo.removeUserGoal(userId, numericId)
    }
  }
}
