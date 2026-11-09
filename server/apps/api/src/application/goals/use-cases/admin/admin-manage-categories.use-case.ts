import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalCategory,
  GoalRepository,
} from '../../../../domains/goals/goal.repository'
import { CreateGoalCategoryDto, UpdateGoalCategoryDto } from '../../dto/goal-category.dto'

@Injectable()
export class AdminManageCategoriesUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async list(): Promise<any[]> {
    const list = await this.goalRepo.findCategories()
    return list.map((cat: any) => ({
      ...cat,
      name: cat.title || cat.name,
      icon: cat.iconName || cat.icon,
      isPublished: cat.status === 'PUBLISHED',
    }))
  }

  async create(dto: CreateGoalCategoryDto): Promise<any> {
    const title = dto.title || dto.name || 'Untitled Category'
    const iconName = dto.iconName || dto.icon || 'Target'
    const status =
      dto.status ||
      (dto.isPublished !== undefined ? (dto.isPublished ? 'PUBLISHED' : 'DRAFT') : undefined)
    const cat: any = await this.goalRepo.createCategory({
      ...dto,
      title,
      iconName,
      status: status as any,
    })
    return {
      ...cat,
      name: cat.title || cat.name,
      icon: cat.iconName || cat.icon,
      isPublished: cat.status === 'PUBLISHED',
    }
  }

  async update(id: number, dto: UpdateGoalCategoryDto): Promise<any> {
    const patch: any = { ...dto }
    if (dto.name && !dto.title) patch.title = dto.name
    if (dto.icon && !dto.iconName) patch.iconName = dto.icon
    if (dto.isPublished !== undefined && !dto.status) {
      patch.status = dto.isPublished ? 'PUBLISHED' : 'DRAFT'
    }
    const cat: any = await this.goalRepo.updateCategory(id, patch)
    return {
      ...cat,
      name: cat.title || cat.name,
      icon: cat.iconName || cat.icon,
      isPublished: cat.status === 'PUBLISHED',
    }
  }

  async delete(id: number): Promise<void> {
    return this.goalRepo.deleteCategory(id)
  }
}
