import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalCategory,
  GoalRepository,
} from '../../../../domains/goals/goal.repository'
import {
  CreateGoalCategoryDto,
  UpdateGoalCategoryDto,
} from '../../dto/goal-category.dto'

@Injectable()
export class AdminManageCategoriesUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async list(): Promise<GoalCategory[]> {
    return this.goalRepo.findCategories()
  }

  async create(dto: CreateGoalCategoryDto): Promise<GoalCategory> {
    return this.goalRepo.createCategory(dto)
  }

  async update(id: number, dto: UpdateGoalCategoryDto): Promise<GoalCategory> {
    return this.goalRepo.updateCategory(id, dto)
  }

  async delete(id: number): Promise<void> {
    return this.goalRepo.deleteCategory(id)
  }
}
