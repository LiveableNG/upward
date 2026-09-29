import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_PM_QUALIFICATION_REPOSITORY,
  IAlliancePmQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPmAssignedQualificationsUseCase {
  constructor(
    @Inject(ALLIANCE_PM_QUALIFICATION_REPOSITORY)
    private readonly pmQualRepo: IAlliancePmQualificationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmIdentifier: number | string) {
    let pmId: number;
    if (typeof pmIdentifier === 'number') {
      pmId = pmIdentifier;
    } else {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: pmIdentifier },
        select: { id: true },
      });
      if (!pm) {
        throw new NotFoundException('Property manager not found');
      }
      pmId = pm.id;
    }

    return this.pmQualRepo.findByPmId(pmId);
  }
}
