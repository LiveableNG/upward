import { Inject, Injectable, Optional, NotFoundException, UnauthorizedException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class RemoveUserGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(userIdentifier: number | string, goalIdentifier: number | string): Promise<void> {
    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      if (!this.userRepo) throw new UnauthorizedException('User repository unavailable')
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) throw new UnauthorizedException('User not found')
      resolvedUserId = user.id
    }

    if (typeof goalIdentifier === 'string' && isNaN(Number(goalIdentifier))) {
      const existing = await this.goalRepo.findUserGoalByUuid(goalIdentifier)
      if (!existing) {
        throw new NotFoundException('User goal record not found')
      }
      await this.goalRepo.removeUserGoalByUuid(resolvedUserId, goalIdentifier)
      return
    }

    const numericId = Number(goalIdentifier)
    let existing = await this.goalRepo.findUserGoal(resolvedUserId, numericId)
    if (!existing && typeof this.goalRepo.findUserGoals === 'function') {
      const allUserGoals = (await this.goalRepo.findUserGoals(resolvedUserId)) || []
      existing =
        allUserGoals.find(
          (ug) => ug.id === numericId || ug.goalId === numericId,
        ) || null
    }

    if (!existing) {
      throw new NotFoundException('User goal record not found')
    }

    await this.goalRepo.removeUserGoal(resolvedUserId, numericId)
  }
}
