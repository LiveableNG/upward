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
export class GetUserGoalDetailUseCase {
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
  ): Promise<UserGoal> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    let goal: UserGoal | null = null
    const numericId = Number(goalIdentifier)

    if (!isNaN(numericId) && Number.isInteger(numericId)) {
      goal = await this.goalRepo.findUserGoalById(numericId)
    } else {
      goal = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!goal || goal.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    return goal
  }
}
