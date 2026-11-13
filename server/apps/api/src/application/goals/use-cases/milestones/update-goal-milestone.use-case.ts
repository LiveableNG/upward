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
import { UpdateGoalMilestoneDto } from '../../dto/user-goal.dto'
import { resolveUserId } from '../user-resolver.helper'

@Injectable()
export class UpdateGoalMilestoneUseCase {
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
    milestoneIdentifier: string | number,
    dto: UpdateGoalMilestoneDto,
  ): Promise<GoalMilestone> {
    const userId = await resolveUserId(userIdentifier, this.userRepo)

    let parentGoal: UserGoal | null = null
    const numericGoalId = Number(goalIdentifier)

    if (!isNaN(numericGoalId) && Number.isInteger(numericGoalId)) {
      parentGoal = await this.goalRepo.findUserGoalById(numericGoalId)
    } else {
      parentGoal = await this.goalRepo.findUserGoalByUuid(String(goalIdentifier))
    }

    if (!parentGoal || parentGoal.userId !== userId) {
      throw new NotFoundException('User goal record not found')
    }

    if (parentGoal.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot modify milestones on an archived goal')
    }

    let milestone: GoalMilestone | null = null
    const numericMilestoneId = Number(milestoneIdentifier)

    if (!isNaN(numericMilestoneId) && Number.isInteger(numericMilestoneId)) {
      milestone = await this.goalRepo.findMilestoneById(numericMilestoneId)
    } else {
      milestone = await this.goalRepo.findMilestoneByUuid(String(milestoneIdentifier))
    }

    if (!milestone || milestone.userGoalId !== parentGoal.id) {
      throw new NotFoundException('Goal milestone record not found')
    }

    if (dto.title !== undefined) {
      const trimmed = dto.title.trim()
      if (trimmed.length === 0) {
        throw new BadRequestException('Milestone title cannot be empty')
      }
    }

    return this.goalRepo.updateMilestone(milestone.id!, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate ? new Date(dto.targetDate) : null } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    })
  }
}
