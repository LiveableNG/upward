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
  UserGoalStatus,
} from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { resolveUserId } from './user-resolver.helper'

@Injectable()
export class ChangeGoalStatusUseCase {
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
    targetStatus: UserGoalStatus,
  ): Promise<UserGoal> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    let existing: UserGoal | null = null
    const numericId = Number(goalIdentifier)

    if (!isNaN(numericId) && Number.isInteger(numericId)) {
      existing = await this.goalRepo.findUserGoalById(numericId)
      if (!existing || existing.userId !== userId) {
        const byCatalogue = await this.goalRepo.findUserGoal(userId, numericId, true)
        if (byCatalogue) existing = byCatalogue
      }
    } else {
      existing = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    const currentStatus = existing.status

    if (currentStatus === targetStatus) {
      throw new BadRequestException(`Goal is already in ${targetStatus} status`)
    }

    const updateData: Partial<UserGoal> = { status: targetStatus }
    const now = new Date()

    // Validate lifecycle transitions
    switch (currentStatus) {
      case 'ACTIVE':
        if (targetStatus === 'PAUSED') {
          updateData.pausedAt = now
        } else if (targetStatus === 'COMPLETED') {
          updateData.completedAt = now
        } else if (targetStatus === 'ARCHIVED') {
          updateData.archivedAt = now
        } else {
          throw new BadRequestException(`Cannot transition goal from ${currentStatus} to ${targetStatus}`)
        }
        break

      case 'PAUSED':
        if (targetStatus === 'ACTIVE') {
          updateData.pausedAt = null
        } else if (targetStatus === 'COMPLETED') {
          updateData.completedAt = now
        } else if (targetStatus === 'ARCHIVED') {
          updateData.archivedAt = now
        } else {
          throw new BadRequestException(`Cannot transition goal from ${currentStatus} to ${targetStatus}`)
        }
        break

      case 'COMPLETED':
        if (targetStatus === 'ACTIVE') {
          updateData.completedAt = null // Reopening completed goal
        } else if (targetStatus === 'ARCHIVED') {
          updateData.archivedAt = now
        } else {
          throw new BadRequestException(`Cannot transition goal from ${currentStatus} to ${targetStatus}`)
        }
        break

      case 'ARCHIVED':
        if (targetStatus === 'ACTIVE') {
          updateData.archivedAt = null // Reactivating archived goal
        } else {
          throw new BadRequestException(`Cannot transition goal from ${currentStatus} to ${targetStatus}. Reactivate to ACTIVE first.`)
        }
        break

      default:
        throw new BadRequestException(`Unknown goal status: ${currentStatus}`)
    }

    return this.goalRepo.updateUserGoal(existing.id!, updateData)
  }
}
