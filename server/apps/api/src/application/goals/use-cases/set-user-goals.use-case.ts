import { Inject, Injectable, Optional, BadRequestException, UnauthorizedException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { TriggerAutomatedRewardUseCase } from '../../rewards/use-cases/trigger-automated-reward.use-case'

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
    @Optional()
    private readonly triggerRewardUseCase?: TriggerAutomatedRewardUseCase,
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

    const result = await this.goalRepo.setUserGoals(resolvedUserId, goalIds)

    if (this.triggerRewardUseCase && this.prisma && goalIds.length > 0) {
      try {
        const selectedGoals = await this.prisma.upward_goal.findMany({
          where: { id: { in: goalIds } },
          select: { category: { select: { slug: true } } },
        })
        const slugs = new Set(
          selectedGoals.map((g) => g.category?.slug?.toLowerCase()).filter(Boolean),
        )
        if (slugs.has('income')) {
          await this.triggerRewardUseCase.execute({
            userId: resolvedUserId,
            triggerKey: 'FORM_INCOME_INFO',
          })
        }
        if (slugs.has('career')) {
          await this.triggerRewardUseCase.execute({
            userId: resolvedUserId,
            triggerKey: 'FORM_CAREER_GOALS',
          })
        }
        if (
          slugs.has('housing') ||
          slugs.has('pay-less') ||
          slugs.has('lifestyle') ||
          slugs.has('children') ||
          slugs.has('fitness')
        ) {
          await this.triggerRewardUseCase.execute({
            userId: resolvedUserId,
            triggerKey: 'FORM_FINANCIAL_GOALS',
          })
        }
      } catch {
        // non-blocking
      }
    }

    return result
  }
}

