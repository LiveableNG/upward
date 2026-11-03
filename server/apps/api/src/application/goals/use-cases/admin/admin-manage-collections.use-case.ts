import { Inject, Injectable } from '@nestjs/common'
import {
  GOAL_REPOSITORY,
  GoalCollection,
  GoalOfferingLink,
  GoalRepository,
} from '../../../../domains/goals/goal.repository'
import {
  CreateGoalCollectionDto,
  LinkOfferingDto,
  UpdateGoalCollectionDto,
} from '../../dto/goal-collection.dto'

@Injectable()
export class AdminManageCollectionsUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepo: GoalRepository,
  ) {}

  async list(goalId: number): Promise<GoalCollection[]> {
    return this.goalRepo.findCollections(goalId)
  }

  async create(dto: CreateGoalCollectionDto): Promise<GoalCollection> {
    return this.goalRepo.createCollection(dto)
  }

  async update(id: number, dto: UpdateGoalCollectionDto): Promise<GoalCollection> {
    return this.goalRepo.updateCollection(id, dto)
  }

  async delete(id: number): Promise<void> {
    return this.goalRepo.deleteCollection(id)
  }

  async linkOffering(goalId: number, dto: LinkOfferingDto): Promise<GoalOfferingLink> {
    return this.goalRepo.linkOfferingToGoal({
      goalId,
      offeringId: dto.offeringId,
      collectionId: dto.collectionId,
      isRecommended: dto.isRecommended,
      relevanceScore: dto.relevanceScore,
      curatorNote: dto.curatorNote,
      sortOrder: dto.sortOrder,
    })
  }

  async unlinkOffering(goalId: number, offeringId: number, collectionId?: number): Promise<void> {
    return this.goalRepo.unlinkOfferingFromGoal(goalId, offeringId, collectionId)
  }
}
