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
import { UpdateUserGoalDto } from '../dto/user-goal.dto'
import { resolveUserId } from './user-resolver.helper'

@Injectable()
export class UpdateUserGoalUseCase {
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
    dto: UpdateUserGoalDto,
  ): Promise<UserGoal> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    // Enforce snapshot immutability
    if (dto.historicalTitle !== undefined) {
      throw new BadRequestException('historicalTitle is immutable once created')
    }
    if (dto.categoryId !== undefined) {
      throw new BadRequestException('categoryId is immutable once created')
    }

    let existing: UserGoal | null = null
    const numericId = Number(goalIdentifier)

    if (!isNaN(numericId) && Number.isInteger(numericId)) {
      if (typeof this.goalRepo.findUserGoalById === 'function') {
        existing = await this.goalRepo.findUserGoalById(numericId)
      }
      // Backward compatibility: if not found by primary key ID or method missing in mock, check if it's catalogue goalId
      if (!existing || existing.userId !== userId) {
        const byCatalogue = await this.goalRepo.findUserGoal(userId, numericId)
        if (byCatalogue) {
          existing = byCatalogue
        }
      }
    } else if (typeof this.goalRepo.findUserGoalByUuid === 'function') {
      existing = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    // Determine target progressSource
    const activeProgressSource = dto.progressSource ?? existing.progressSource ?? 'MANUAL_PERCENT'

    // RENT_VAULT integrity protections
    if (activeProgressSource === 'RENT_VAULT') {
      if (dto.currentAmountMinor !== undefined) {
        throw new BadRequestException('Cannot manually update balance for rent-vault-backed goals')
      }
      if (dto.progressPct !== undefined) {
        throw new BadRequestException('Cannot manually update progress percentage for rent-vault-backed goals')
      }
      if (dto.lastVerifiedBalanceMinor !== undefined) {
        throw new BadRequestException('lastVerifiedBalanceMinor cannot be manually modified')
      }
    }

    // Parse and validate monetary amounts
    let currentAmountMinor: bigint | null | undefined = existing.currentAmountMinor
    if (dto.currentAmountMinor !== undefined) {
      currentAmountMinor = GoalProgressEngine.parseMinorUnits(dto.currentAmountMinor, 'currentAmountMinor')
    }

    let targetAmountMinor: bigint | null | undefined = existing.targetAmountMinor
    if (dto.targetAmountMinor !== undefined) {
      targetAmountMinor = GoalProgressEngine.parseMinorUnits(dto.targetAmountMinor, 'targetAmountMinor')
    }

    // Validate TARGET_AMOUNT invariants
    if (activeProgressSource === 'TARGET_AMOUNT') {
      if (targetAmountMinor === null || targetAmountMinor === undefined || targetAmountMinor <= 0n) {
        throw new BadRequestException('Target amount must be strictly positive for target-amount progress')
      }
      const cur = currentAmountMinor ?? 0n
      if (cur > targetAmountMinor) {
        throw new BadRequestException('Current amount cannot exceed target amount')
      }
    }

    // RENT_VAULT verified balance data path
    let rentVaultBalanceMinor: bigint | null = null
    let rentVaultTargetMinor: bigint | null = null
    let verifiedSourceUuid: string | null = existing.verifiedSourceUuid ?? null
    let verifiedAt: Date | null = existing.verifiedAt ?? null

    if (activeProgressSource === 'RENT_VAULT' && existing.rentVault) {
      // Strictly verify authenticated user owns the linked rent vault
      if (existing.rentVault.userId === userId) {
        // Strictly use verified principal only, NEVER accrued yield
        rentVaultBalanceMinor = existing.rentVault.currentPrincipalKobo
        rentVaultTargetMinor = targetAmountMinor ?? existing.rentVault.targetAmountKobo
        verifiedSourceUuid = existing.rentVault.uuid
        verifiedAt = new Date()
      }
    }

    // Fetch milestones if milestone-driven
    let milestones = existing.milestones
    if (activeProgressSource === 'MILESTONES' && (!milestones || milestones.length === 0)) {
      milestones = await this.goalRepo.findMilestones(existing.id!)
    }

    // Progress validation & calculation
    const calculatedProgressPct = GoalProgressEngine.validateAndUpdateProgress({
      source: activeProgressSource,
      currentProgressPct: existing.progressPct,
      newProgressPct: dto.progressPct,
      milestones,
      currentAmountMinor,
      targetAmountMinor,
      rentVaultBalanceMinor,
      rentVaultTargetMinor,
    })

    const updateData: Partial<UserGoal> = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.customTitle !== undefined ? { customTitle: dto.customTitle ? dto.customTitle.trim() : null } : {}),
      ...(dto.customDescription !== undefined ? { customDescription: dto.customDescription } : {}),
      ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate ? new Date(dto.targetDate) : null } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.currency ? { currency: dto.currency } : {}),
      ...(dto.progressSource ? { progressSource: dto.progressSource } : {}),
      ...(currentAmountMinor !== undefined ? { currentAmountMinor } : {}),
      ...(targetAmountMinor !== undefined ? { targetAmountMinor } : {}),
      ...(activeProgressSource === 'RENT_VAULT' && rentVaultBalanceMinor !== null
        ? {
            lastVerifiedBalanceMinor: rentVaultBalanceMinor,
            verifiedSourceUuid,
            verifiedAt,
          }
        : {}),
      ...(dto.completedAt !== undefined ? { completedAt: dto.completedAt ? new Date(dto.completedAt) : null } : {}),
      progressPct: calculatedProgressPct,
    }

    return this.goalRepo.updateUserGoal(existing.id!, updateData)
  }
}
