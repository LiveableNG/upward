import { Inject, Injectable } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalActionTemplate,
  GoalRepository,
} from '../../../../domains/goals/goal.repository'
import {
  CreateActionTemplateDto,
  UpdateActionTemplateDto,
} from '../../dto/goal.dto'

@Injectable()
export class AdminManageActionTemplatesUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async list(goalId: number): Promise<GoalActionTemplate[]> {
    return this.goalRepo.findActionTemplates(goalId)
  }

  async create(goalId: number, dto: CreateActionTemplateDto): Promise<GoalActionTemplate> {
    return this.goalRepo.createActionTemplate({
      goalId,
      title: dto.title,
      description: dto.description || null,
      sortOrder: dto.sortOrder || 0,
      isRequired: dto.isRequired || false,
    })
  }

  async update(id: number, dto: UpdateActionTemplateDto): Promise<GoalActionTemplate> {
    return this.goalRepo.updateActionTemplate(id, dto)
  }

  async delete(id: number): Promise<void> {
    return this.goalRepo.deleteActionTemplate(id)
  }
}

