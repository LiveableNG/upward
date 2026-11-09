import {
  Inject,
  Injectable,
  Optional,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { GOAL_REPOSITORY, GoalRepository, UserGoal } from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class SetUserGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(userIdentifier: number | string, goalIds: number[]): Promise<UserGoal[]> {
    if (!Array.isArray(goalIds)) {
      throw new BadRequestException('Goal IDs must be provided as an array')
    }

    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      if (!this.userRepo) throw new UnauthorizedException('User repository unavailable')
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) throw new UnauthorizedException('User not found')
      resolvedUserId = user.id
    }

    return this.goalRepo.setUserGoals(resolvedUserId, goalIds)
  }
}
