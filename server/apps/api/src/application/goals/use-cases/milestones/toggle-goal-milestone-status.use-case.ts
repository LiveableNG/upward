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
import { resolveUserId } from '../user-resolver.helper'

@Injectable()
export class ToggleGoalMilestoneStatusUseCase {
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

    const newStatus = milestone.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    const completedAt = newStatus === 'COMPLETED' ? new Date() : null

    const updated = await this.goalRepo.updateMilestone(milestone.id!, {
      status: newStatus,
      completedAt,
    })

    // If milestone-driven progress, recalculate parent goal progressPct
    if (parentGoal.progressSource === 'MILESTONES') {
      const allMilestones = await this.goalRepo.findMilestones(parentGoal.id!)
      const newProgress = GoalProgressEngine.calculateFromMilestones(allMilestones)
      await this.goalRepo.updateUserGoal(parentGoal.id!, { progressPct: newProgress })
    }

    return updated
  }
}
