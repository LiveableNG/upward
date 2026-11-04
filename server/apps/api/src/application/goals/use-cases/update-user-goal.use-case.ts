import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalRepository,
  UserGoal,
} from '../../../domains/goals/goal.repository'
import { UpdateUserGoalDto } from '../dto/user-goal.dto'

@Injectable()
export class UpdateUserGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(userId: number | string, goalId: number, dto: UpdateUserGoalDto): Promise<UserGoal> {
    const existing = await this.goalRepo.findUserGoal(userId, goalId)
    if (!existing || !existing.id) {
      throw new NotFoundException('User goal record not found')
    }

    const updateData: Partial<UserGoal> = {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.targetDate ? { targetDate: new Date(dto.targetDate) } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.progressPct !== undefined ? { progressPct: dto.progressPct } : {}),
      ...(dto.completedAt ? { completedAt: new Date(dto.completedAt) } : {}),
    }

    return this.goalRepo.updateUserGoal(existing.id, updateData)
  }
}

