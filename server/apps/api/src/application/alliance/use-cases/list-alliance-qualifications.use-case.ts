import { Inject, Injectable } from '@nestjs/common';
import {
  ALLIANCE_QUALIFICATION_REPOSITORY,
  IAllianceQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';

@Injectable()
export class ListAllianceQualificationsUseCase {
  constructor(
    @Inject(ALLIANCE_QUALIFICATION_REPOSITORY)
    private readonly qualificationRepo: IAllianceQualificationRepository,
  ) {}

  async execute(options?: { includeInactive?: boolean }) {
    return this.qualificationRepo.findAll(options);
  }
}
