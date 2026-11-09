import { Inject, Injectable } from '@nestjs/common'
import { GOAL_REPOSITORY, Goal, GoalRepository } from '../../../../domains/goals/goal.repository'
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
    const tagline = dto.tagline || dto.subtitle
    const iconName = dto.iconName || dto.icon
    const heroImage = dto.heroImage || dto.coverImageUrl
    const status =
      dto.status ||
      (dto.isPublished !== undefined ? (dto.isPublished ? 'PUBLISHED' : 'DRAFT') : undefined)
    const { subtitle, icon, coverImageUrl, tags, isPublished, ...rest } = dto
    return this.goalRepo.createGoal({
      ...rest,
      tagline,
      iconName,
      heroImage,
      status: status as any,
    })
  }

  async update(id: number, dto: UpdateGoalDto): Promise<Goal> {
    const patch: any = { ...dto }
    if (dto.subtitle && !dto.tagline) patch.tagline = dto.subtitle
    if (dto.icon && !dto.iconName) patch.iconName = dto.icon
    if (dto.coverImageUrl && !dto.heroImage) patch.heroImage = dto.coverImageUrl
    if (dto.isPublished !== undefined && !dto.status) {
      patch.status = dto.isPublished ? 'PUBLISHED' : 'DRAFT'
    }
    delete patch.subtitle
    delete patch.icon
    delete patch.coverImageUrl
    delete patch.tags
    delete patch.isPublished
    return this.goalRepo.updateGoal(id, patch)
  }

  async delete(id: number): Promise<void> {
    return this.goalRepo.deleteGoal(id)
  }
}
