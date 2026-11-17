import { Inject, Injectable, Optional, BadRequestException, UnauthorizedException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class SetUserGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  async execute(userIdentifier: number | string, goalIds: number[]): Promise<UserGoal[]> {
    if (!Array.isArray(goalIds)) {
      throw new BadRequestException('Goal IDs must be provided as an array')
    }

    // Enforce business rule: Cap of 3 goals per category
    if (this.prisma && goalIds.length > 0) {
      const goals = await this.prisma.upward_goal.findMany({
        where: { id: { in: goalIds } },
        select: { id: true, categoryId: true, category: { select: { title: true } } },
      })
      const countByCat = new Map<number, { count: number; title: string }>()
      for (const g of goals) {
        const existing = countByCat.get(g.categoryId)
        const currentCount = existing ? existing.count + 1 : 1
        const title = existing?.title || g.category?.title || 'this category'
        if (currentCount > 3) {
          throw new BadRequestException(
            `You can select a maximum of 3 goals in "${title}".`,
          )
        }
        countByCat.set(g.categoryId, { count: currentCount, title })
      }
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

