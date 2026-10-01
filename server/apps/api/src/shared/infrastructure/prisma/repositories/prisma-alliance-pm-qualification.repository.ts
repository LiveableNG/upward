import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IAlliancePmQualificationRepository } from '../../../../domains/alliance/alliance.repository.interface';
import { AlliancePmQualificationEntity } from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAlliancePmQualificationRepository implements IAlliancePmQualificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapPmQualification(raw: any): AlliancePmQualificationEntity {
    return {
      id: raw.id,
      uuid: raw.uuid,
      pmId: raw.pmId,
      qualificationId: raw.qualificationId,
      assignedByAdminId: raw.assignedByAdminId,
      assignedAt: raw.assignedAt,
      qualification: raw.qualification ? {
        id: raw.qualification.id,
        uuid: raw.qualification.uuid,
        slug: raw.qualification.slug,
        name: raw.qualification.name,
        description: raw.qualification.description,
        isActive: raw.qualification.isActive,
        createdAt: raw.qualification.createdAt,
        updatedAt: raw.qualification.updatedAt,
      } : undefined,
    };
  }

  async assign(pmId: number, qualificationId: number, adminId?: string | null): Promise<AlliancePmQualificationEntity> {
    const record = await (this.prisma as any).upward_alliance_pm_qualification.create({
      data: {
        pmId,
        qualificationId,
        assignedByAdminId: adminId || null,
      },
      include: {
        qualification: true,
      },
    });
    return this.mapPmQualification(record);
  }

  async remove(pmId: number, qualificationId: number): Promise<boolean> {
    const deleted = await (this.prisma as any).upward_alliance_pm_qualification.deleteMany({
      where: {
        pmId,
        qualificationId,
      },
    });
    return deleted.count > 0;
  }

  async findByPmId(pmId: number): Promise<AlliancePmQualificationEntity[]> {
    const records = await (this.prisma as any).upward_alliance_pm_qualification.findMany({
      where: { pmId },
      include: {
        qualification: true,
      },
      orderBy: { assignedAt: 'asc' },
    });
    return records.map((r: any) => this.mapPmQualification(r));
  }

  async findByPmAndQualification(pmId: number, qualificationId: number): Promise<AlliancePmQualificationEntity | null> {
    const record = await (this.prisma as any).upward_alliance_pm_qualification.findUnique({
      where: {
        pmId_qualificationId: {
          pmId,
          qualificationId,
        },
      },
      include: {
        qualification: true,
      },
    });
    return record ? this.mapPmQualification(record) : null;
  }
}
