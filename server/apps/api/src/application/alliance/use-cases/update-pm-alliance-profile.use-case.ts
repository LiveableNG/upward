import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  IAllianceProfileRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { UpdatePmAllianceProfileDto } from '../dtos/alliance.dto';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class UpdatePmAllianceProfileUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, dto: UpdatePmAllianceProfileDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { id: pmId },
      select: { id: true },
    });

    if (!pm) {
      throw new NotFoundException('Property manager not found');
    }

    await this.profileRepo.ensureProfile(pmId);

    const updatePayload: { pmTitle?: string; bio?: string } = {};
    if (dto.pmTitle !== undefined) {
      updatePayload.pmTitle = dto.pmTitle.trim() || undefined;
    }
    if (dto.bio !== undefined) {
      updatePayload.bio = dto.bio.trim() || undefined;
    }

    return this.profileRepo.update(pmId, updatePayload);
  }
}
