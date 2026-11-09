import {
  Inject,
  Injectable,
  Optional,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { GOAL_REPOSITORY, GoalRepository, UserGoal } from '../../../domains/goals/goal.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { UpdateUserGoalDto } from '../dto/user-goal.dto'

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
    goalId: number,
    dto: UpdateUserGoalDto,
  ): Promise<UserGoal> {
    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      if (!this.userRepo) throw new UnauthorizedException('User repository unavailable')
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) throw new UnauthorizedException('User not found')
      resolvedUserId = user.id
    }

    const existing = await this.goalRepo.findUserGoal(resolvedUserId, goalId)
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
