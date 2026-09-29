import { Inject, Injectable } from '@nestjs/common';
import {
  ALLIANCE_RATING_REPOSITORY,
  IAllianceRatingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { AllianceRatingSubjectType } from '../../../domains/alliance/alliance.entity';

@Injectable()
export class GetSubjectRatingSummaryUseCase {
  constructor(
    @Inject(ALLIANCE_RATING_REPOSITORY)
    private readonly ratingRepo: IAllianceRatingRepository,
  ) {}

  async execute(subjectType: AllianceRatingSubjectType, subjectId: number) {
    return this.ratingRepo.getRatingSummaryForSubject(subjectType, subjectId);
  }
}
