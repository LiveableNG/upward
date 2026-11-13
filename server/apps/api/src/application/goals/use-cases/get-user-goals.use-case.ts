import { Inject, Injectable, Optional } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
  UserGoalStatus,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { GetUserGoalsQueryDto } from '../dto/user-goal.dto'
import { resolveUserId } from './user-resolver.helper'

@Injectable()
export class GetUserGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(
    userIdentifier: number | string,
    queryOrStatus?: UserGoalStatus | GetUserGoalsQueryDto,
  ): Promise<{ items: UserGoal[]; total: number } | UserGoal[]> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    if (typeof queryOrStatus === 'string' || queryOrStatus === undefined) {
      // Legacy signature support
      return this.goalRepo.findUserGoals(userId, queryOrStatus)
    }

    // Modern paged query
    return this.goalRepo.findUserGoalsPaged(userId, {
      status: queryOrStatus.status,
      includeArchived: queryOrStatus.includeArchived,
      categoryId: queryOrStatus.categoryId,
      categorySlug: queryOrStatus.categorySlug,
      skip: queryOrStatus.skip,
      take: queryOrStatus.take,
    })
  }
}
