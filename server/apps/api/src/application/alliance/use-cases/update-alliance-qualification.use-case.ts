import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  ALLIANCE_QUALIFICATION_REPOSITORY,
  IAllianceQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { UpdateAllianceQualificationDto } from '../dtos/alliance.dto';

@Injectable()
export class UpdateAllianceQualificationUseCase {
  constructor(
    @Inject(ALLIANCE_QUALIFICATION_REPOSITORY)
    private readonly qualificationRepo: IAllianceQualificationRepository,
  ) {}

  async execute(id: number, dto: UpdateAllianceQualificationDto) {
    const existing = await this.qualificationRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Qualification not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.qualificationRepo.findBySlug(dto.slug);
      if (slugConflict && slugConflict.id !== id) {
        throw new ConflictException(`Qualification with slug "${dto.slug}" already exists.`);
      }
    }

    return this.qualificationRepo.update(id, dto);
  }
}
