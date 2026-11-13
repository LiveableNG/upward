import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalMilestone,
  GoalRepository,
  UserGoal,
} from '../../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository'
import { resolveUserId } from '../user-resolver.helper'

@Injectable()
export class GetGoalMilestonesUseCase {
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
  ): Promise<GoalMilestone[]> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    let parentGoal: UserGoal | null = null
    const numericId = Number(goalIdentifier)

    if (!isNaN(numericId) && Number.isInteger(numericId)) {
      parentGoal = await this.goalRepo.findUserGoalById(numericId)
    } else {
      parentGoal = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!parentGoal || parentGoal.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    return this.goalRepo.findMilestones(parentGoal.id!)
  }
}
