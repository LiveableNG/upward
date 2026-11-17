import { Inject, Injectable, Optional, BadRequestException, UnauthorizedException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
  UserGoalAction,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { CreateCustomGoalDto } from '../dto/user-goal.dto'
import { computeTargetDate } from '../../../domains/goals/timeline.calculator'
import { randomUUID } from 'crypto'

@Injectable()
export class CreateCustomGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(userIdentifier: number | string, dto: CreateCustomGoalDto): Promise<UserGoal> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Goal title is required')
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

    const durationDays = dto.durationDays || 180 // default 6 months
    const targetDate = computeTargetDate(new Date(), durationDays)

    const initialActions: UserGoalAction[] = (dto.actions || []).map((label, index) => ({
      id: `act-${randomUUID().slice(0, 8)}`,
      label,
      done: false,
      sortOrder: index,
    }))

    const targetAmountKobo = dto.targetAmountKobo
      ? BigInt(dto.targetAmountKobo)
      : null

    return this.goalRepo.createCustomUserGoal(resolvedUserId, {
      title: dto.title.trim(),
      categorySlug: dto.categorySlug || 'lifestyle',
      icon: dto.icon || '🎯',
      targetType: dto.targetType || (targetAmountKobo ? 'AMOUNT' : 'CHECKLIST_ACTIONS'),
      durationDays,
      targetDate,
      targetAmountKobo,
      savedAmountKobo: BigInt(0),
      actions: initialActions,
      status: 'ACTIVE',
      notes: dto.notes || null,
    })
  }
}

