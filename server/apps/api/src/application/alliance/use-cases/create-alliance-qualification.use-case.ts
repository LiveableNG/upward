import { Inject, Injectable, ConflictException } from '@nestjs/common';
import {
  ALLIANCE_QUALIFICATION_REPOSITORY,
  IAllianceQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { CreateAllianceQualificationDto } from '../dtos/alliance.dto';

@Injectable()
export class CreateAllianceQualificationUseCase {
  constructor(
    @Inject(ALLIANCE_QUALIFICATION_REPOSITORY)
    private readonly qualificationRepo: IAllianceQualificationRepository,
  ) {}

  async execute(dto: CreateAllianceQualificationDto) {
    const existing = await this.qualificationRepo.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Qualification with slug "${dto.slug}" already exists.`);
    }

    return this.qualificationRepo.create({
      slug: dto.slug,
      name: dto.name,
      description: dto.description || null,
      isActive: dto.isActive ?? true,
    });
  }
}
