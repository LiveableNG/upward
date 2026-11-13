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
import { AdoptCatalogueGoalDto } from '../dto/user-goal.dto'
import { resolveUserId } from './user-resolver.helper'

@Injectable()
export class AdoptCatalogueGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(
    userIdentifier: number | string,
    dto: AdoptCatalogueGoalDto,
  ): Promise<UserGoal> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    // 1. Verify catalogue goal exists and is published
    const catalogueGoal = await this.goalRepo.findGoalById(dto.goalId)
    if (!catalogueGoal || catalogueGoal.status !== 'PUBLISHED') {
      throw new NotFoundException(`Published catalogue goal with ID ${dto.goalId} not found`)
    }

    // 2. Check for existing user goal for this catalogue goal (including archived)
    const existing = await this.goalRepo.findUserGoal(userId, dto.goalId, true)

    // Parse monetary amount if provided
    let targetAmountMinor: bigint | null = null
    if (dto.targetAmountMinor !== undefined && dto.targetAmountMinor !== null) {
      targetAmountMinor = GoalProgressEngine.parseMinorUnits(dto.targetAmountMinor, 'targetAmountMinor')
      if (dto.progressSource === 'TARGET_AMOUNT' && (targetAmountMinor === null || targetAmountMinor <= 0n)) {
        throw new BadRequestException('Target amount must be strictly positive for target-amount progress')
      }
    }

    if (existing) {
      if (existing.status !== 'ARCHIVED') {
        throw new BadRequestException('Goal is already active for this user')
      }

      // Reactivate archived goal, preserving milestones & progress
      const resolvedTarget =
        targetAmountMinor !== null ? targetAmountMinor : existing.targetAmountMinor

      return this.goalRepo.updateUserGoal(existing.id!, {
        status: 'ACTIVE',
        archivedAt: null,
        ...(dto.targetDate ? { targetDate: new Date(dto.targetDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(resolvedTarget !== undefined ? { targetAmountMinor: resolvedTarget } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.progressSource ? { progressSource: dto.progressSource } : {}),
      })
    }

    return this.goalRepo.createUserGoal({
      userId,
      goalId: catalogueGoal.id,
      categoryId: catalogueGoal.categoryId,
      historicalTitle: catalogueGoal.title,
      customTitle: null,
      customDescription: null,
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
