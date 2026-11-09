import { Inject, Injectable } from '@nestjs/common'
import { GOAL_REPOSITORY, Goal, GoalRepository } from '../../../domains/goals/goal.repository'
import { GoalQueryDto } from '../dto/goal.dto'

@Injectable()
export class GetGoalsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async execute(query?: GoalQueryDto): Promise<{ items: Goal[]; total: number }> {
    const status = query?.status ?? 'PUBLISHED'
    return this.goalRepo.findGoals({
      categoryId: query?.categoryId,
      categorySlug: query?.categorySlug,
      status,
      isFeatured: query?.isFeatured,
      search: query?.search,
      skip: query?.skip ?? 0,
      take: query?.take ?? 20,
    })
  }
}
