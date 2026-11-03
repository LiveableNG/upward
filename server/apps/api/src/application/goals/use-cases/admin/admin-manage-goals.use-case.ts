import { Inject, Injectable } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  Goal,
  GoalRepository,
} from '../../../../domains/goals/goal.repository'
import { CreateGoalDto, GoalQueryDto, UpdateGoalDto } from '../../dto/goal.dto'

@Injectable()
export class AdminManageGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async list(query?: GoalQueryDto): Promise<{ items: Goal[]; total: number }> {
    return this.goalRepo.findGoals(query)
  }

  async create(dto: CreateGoalDto): Promise<Goal> {
    return this.goalRepo.createGoal(dto)
  }

  async update(id: number, dto: UpdateGoalDto): Promise<Goal> {
    return this.goalRepo.updateGoal(id, dto)
  }

  async delete(id: number): Promise<void> {
    return this.goalRepo.deleteGoal(id)
  }
}
