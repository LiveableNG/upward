import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IAllianceProfileRepository } from '../../../../domains/alliance/alliance.repository.interface';
import { AlliancePmProfileEntity } from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceProfileRepository implements IAllianceProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapProfile(raw: any): AlliancePmProfileEntity {
    return {
      id: raw.id,
      uuid: raw.uuid,
      pmId: raw.pmId,
      isEnabled: raw.isEnabled,
      enabledAt: raw.enabledAt,
      disabledAt: raw.disabledAt,
      pmTitle: raw.pmTitle,
      bio: raw.bio,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async findByPmId(pmId: number): Promise<AlliancePmProfileEntity | null> {
    const profile = await (this.prisma as any).upward_alliance_pm_profile.findUnique({
      where: { pmId },
    });
    return profile ? this.mapProfile(profile) : null;
  }

  async findByPmUuid(pmUuid: string): Promise<AlliancePmProfileEntity | null> {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      select: { id: true },
    });
    if (!pm) return null;
    return this.findByPmId(pm.id);
  }

  async ensureProfile(pmId: number): Promise<AlliancePmProfileEntity> {
    let profile = await (this.prisma as any).upward_alliance_pm_profile.findUnique({
      where: { pmId },
    });
    if (!profile) {
      profile = await (this.prisma as any).upward_alliance_pm_profile.create({
        data: {
          pmId,
          isEnabled: false,
        },
      });
    }
    return this.mapProfile(profile);
  }

  async update(
    pmId: number,
    data: Partial<Omit<AlliancePmProfileEntity, 'id' | 'uuid' | 'pmId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<AlliancePmProfileEntity> {
    const profile = await (this.prisma as any).upward_alliance_pm_profile.upsert({
      where: { pmId },
      create: {
        pmId,
        isEnabled: data.isEnabled ?? false,
        enabledAt: data.enabledAt,
        disabledAt: data.disabledAt,
        pmTitle: data.pmTitle,
        bio: data.bio,
      },
      update: {
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.enabledAt !== undefined ? { enabledAt: data.enabledAt } : {}),
        ...(data.disabledAt !== undefined ? { disabledAt: data.disabledAt } : {}),
        ...(data.pmTitle !== undefined ? { pmTitle: data.pmTitle } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
      },
    });
    return this.mapProfile(profile);
  }
}
