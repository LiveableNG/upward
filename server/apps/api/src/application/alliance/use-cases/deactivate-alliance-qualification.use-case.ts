import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_QUALIFICATION_REPOSITORY,
  IAllianceQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';

@Injectable()
export class DeactivateAllianceQualificationUseCase {
  constructor(
    @Inject(ALLIANCE_QUALIFICATION_REPOSITORY)
    private readonly qualificationRepo: IAllianceQualificationRepository,
  ) {}

  async execute(id: number) {
    const existing = await this.qualificationRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Qualification not found');
    }

    return this.qualificationRepo.update(id, { isActive: false });
  }
}
