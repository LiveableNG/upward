import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IAllianceQualificationRepository } from '../../../../domains/alliance/alliance.repository.interface';
import { AllianceQualificationEntity } from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceQualificationRepository implements IAllianceQualificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapQualification(raw: any): AllianceQualificationEntity {
    return {
      id: raw.id,
      uuid: raw.uuid,
      slug: raw.slug,
      name: raw.name,
      description: raw.description,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async create(data: { slug: string; name: string; description?: string | null; isActive?: boolean }): Promise<AllianceQualificationEntity> {
    const record = await (this.prisma as any).upward_alliance_qualification.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        isActive: data.isActive ?? true,
      },
    });
    return this.mapQualification(record);
  }

  async findById(id: number): Promise<AllianceQualificationEntity | null> {
    const record = await (this.prisma as any).upward_alliance_qualification.findUnique({
      where: { id },
    });
    return record ? this.mapQualification(record) : null;
  }

  async findBySlug(slug: string): Promise<AllianceQualificationEntity | null> {
    const record = await (this.prisma as any).upward_alliance_qualification.findUnique({
      where: { slug },
    });
    return record ? this.mapQualification(record) : null;
  }

  async findAll(options?: { includeInactive?: boolean }): Promise<AllianceQualificationEntity[]> {
    const where: any = {};
    if (!options?.includeInactive) {
      where.isActive = true;
    }
    const records = await (this.prisma as any).upward_alliance_qualification.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return records.map((r: any) => this.mapQualification(r));
  }

  async update(id: number, data: Partial<{ name: string; description: string | null; isActive: boolean; slug: string }>): Promise<AllianceQualificationEntity> {
    const record = await (this.prisma as any).upward_alliance_qualification.update({
      where: { id },
      data,
    });
    return this.mapQualification(record);
  }
}
