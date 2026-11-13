import {
  BadRequestException,
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
import { GoalProgressEngine } from '../../../domains/goals/goal-progress.engine'
import { CreateCustomGoalDto } from '../dto/user-goal.dto'
import { resolveUserId } from './user-resolver.helper'

@Injectable()
export class CreateCustomGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(
    userIdentifier: number | string,
    dto: CreateCustomGoalDto,
  ): Promise<UserGoal> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    const trimmedTitle = dto.customTitle ? dto.customTitle.trim() : ''
    if (trimmedTitle.length === 0) {
      throw new BadRequestException('customTitle cannot be empty')
    }

    if (!dto.categoryId) {
      throw new BadRequestException('categoryId is required for custom goals')
    }

    // Verify category exists
    const category = await this.goalRepo.findCategories({ status: 'PUBLISHED' })
    const matchedCategory = category.find((c) => c.id === dto.categoryId)
    if (!matchedCategory) {
      throw new NotFoundException(`Published category with ID ${dto.categoryId} not found`)
    }

    let targetAmountMinor: bigint | null = null
    if (dto.targetAmountMinor !== undefined && dto.targetAmountMinor !== null) {
      targetAmountMinor = GoalProgressEngine.parseMinorUnits(dto.targetAmountMinor, 'targetAmountMinor')
      if (dto.progressSource === 'TARGET_AMOUNT' && (targetAmountMinor === null || targetAmountMinor <= 0n)) {
        throw new BadRequestException('Target amount must be strictly positive for target-amount progress')
      }
    }

    return this.goalRepo.createUserGoal({
      userId,
      goalId: null,
      categoryId: dto.categoryId,
      historicalTitle: trimmedTitle,
      customTitle: trimmedTitle,
      customDescription: dto.customDescription ?? null,
      status: 'ACTIVE',
      progressSource: dto.progressSource ?? 'MANUAL_PERCENT',
      progressPct: 0,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      notes: dto.notes ?? null,
      targetAmountMinor,
      currency: dto.currency ?? 'NGN',
    })
  }
}
