import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_PM_QUALIFICATION_REPOSITORY,
  IAllianceProfileRepository,
  IAlliancePmQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPmAllianceProfileUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_PM_QUALIFICATION_REPOSITORY)
    private readonly pmQualRepo: IAlliancePmQualificationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmIdentifier: number | string) {
    let pmId: number;
    let pmUuid: string;

    if (typeof pmIdentifier === 'number') {
      pmId = pmIdentifier;
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { id: pmId },
        select: { uuid: true },
      });
      if (!pm) {
        throw new NotFoundException('Property manager not found');
      }
      pmUuid = pm.uuid;
    } else {
      pmUuid = pmIdentifier;
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: pmUuid },
        select: { id: true },
      });
      if (!pm) {
        throw new NotFoundException('Property manager not found');
      }
      pmId = pm.id;
    }

    const [profile, qualifications] = await Promise.all([
      this.profileRepo.ensureProfile(pmId),
      this.pmQualRepo.findByPmId(pmId),
    ]);

    return {
      id: profile.id,
      uuid: profile.uuid,
      pmId: profile.pmId,
      pmUuid,
      isEnabled: profile.isEnabled,
      enabledAt: profile.enabledAt,
      disabledAt: profile.disabledAt,
      pmTitle: profile.pmTitle,
      bio: profile.bio,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      qualifications: qualifications
        .filter((q) => q.qualification?.isActive)
        .map((q) => ({
          id: q.qualification!.id,
          uuid: q.qualification!.uuid,
          slug: q.qualification!.slug,
          name: q.qualification!.name,
          description: q.qualification!.description,
          assignedAt: q.assignedAt,
        })),
    };
  }
}
