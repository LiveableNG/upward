import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalMilestone,
  GoalRepository,
  UserGoal,
} from '../../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository'
import { GoalProgressEngine } from '../../../../domains/goals/goal-progress.engine'
import { CreateGoalMilestoneDto } from '../../dto/user-goal.dto'
import { resolveUserId } from '../user-resolver.helper'

@Injectable()
export class CreateGoalMilestoneUseCase {
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
    dto: CreateGoalMilestoneDto,
  ): Promise<GoalMilestone> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    let parentGoal: UserGoal | null = null
    const numericId = Number(goalIdentifier)

    if (!isNaN(numericId) && Number.isInteger(numericId)) {
      parentGoal = await this.goalRepo.findUserGoalById(numericId)
    } else {
      parentGoal = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!parentGoal || parentGoal.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    if (parentGoal.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot modify milestones on an archived goal')
    }

    const trimmedTitle = dto.title ? dto.title.trim() : ''
    if (trimmedTitle.length === 0) {
      throw new BadRequestException('Milestone title cannot be empty')
    }

    const existingMilestones = await this.goalRepo.findMilestones(parentGoal.id!)
    let sortOrder = dto.sortOrder

    if (sortOrder === undefined) {
      sortOrder =
        existingMilestones.length > 0
          ? Math.max(...existingMilestones.map((m) => m.sortOrder)) + 1
          : 0
    }

    const created = await this.goalRepo.createMilestone({
      userGoalId: parentGoal.id!,
      title: trimmedTitle,
      status: 'PENDING',
      sortOrder,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
    })

    // If milestone-driven progress, update parent goal progressPct
    if (parentGoal.progressSource === 'MILESTONES') {
      const allMilestones = [...existingMilestones, created]
      const newProgress = GoalProgressEngine.calculateFromMilestones(allMilestones)
      await this.goalRepo.updateUserGoal(parentGoal.id!, { progressPct: newProgress })
    }

    return created
  }
}
