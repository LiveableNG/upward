import { Inject, Injectable } from '@nestjs/common';
import {
  ALLIANCE_RATING_REPOSITORY,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { AllianceRatingSubjectType } from '../../../domains/alliance/alliance.entity';
import { ListAllianceRatingsQueryDto } from '../dtos/alliance-rating.dto';

@Injectable()
export class ListSubjectRatingsUseCase {
  constructor(
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
  ) {}

  async execute(dto: ListAllianceRatingsQueryDto) {
    const page = Math.max(1, Number(dto.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(dto.limit) || 20));
    const skip = (page - 1) * limit;

    const { items, total } = await this.ratingRepo.listRatingsForSubject(
      dto.subjectType,
      dto.subjectId,
      { skip, take: limit },
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
