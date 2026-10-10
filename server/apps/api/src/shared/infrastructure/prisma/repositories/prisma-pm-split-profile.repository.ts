import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ISplitProfileRepository,
  SplitProfileEntity,
  CreateSplitProfileData,
  UpdateSplitProfileData,
} from '../../../../domains/pm/ISplitProfileRepository';

@Injectable()
export class PrismaPmSplitProfileRepository implements ISplitProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapProfile(record: any): SplitProfileEntity {
    return {
      id: record.id,
      uuid: record.uuid,
      pmId: record.pmId,
      name: record.name,
      description: record.description || null,
      isDefault: Boolean(record.isDefault),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      propertiesCount: record.properties ? record.properties.length : (record._count?.properties || 0),
      properties: record.properties?.map((p: any) => ({
        id: p.id,
        uuid: p.uuid,
        name: p.name,
        address: p.address,
      })) || [],
      items: record.items?.map((it: any) => ({
        id: it.id,
        uuid: it.uuid,
        manualAccountId: it.manualAccountId,
        percentage: Number(it.percentage),
        lineItemName: it.lineItemName || 'Rent',
        manualAccount: it.manualAccount ? {
          id: it.manualAccount.id,
          uuid: it.manualAccount.uuid,
          accountNumber: it.manualAccount.accountNumber,
          accountName: it.manualAccount.accountName,
          bankName: it.manualAccount.bankName,
          bankCode: it.manualAccount.bankCode,
          isPrimary: Boolean(it.manualAccount.isPrimary),
          title: it.manualAccount.title || null,
        } : null,
      })) || [],
    };
  }

  async findByPmId(pmId: number): Promise<SplitProfileEntity[]> {
    const records = await (this.prisma as any).upward_pm_split_profile.findMany({
      where: { pmId },
      include: {
        items: {
          include: { manualAccount: true },
        },
        properties: {
          select: { id: true, uuid: true, name: true, address: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    return records.map((r: any) => this.mapProfile(r));
  }

  async findByUuid(uuid: string): Promise<SplitProfileEntity | null> {
    const record = await (this.prisma as any).upward_pm_split_profile.findUnique({
      where: { uuid },
      include: {
        items: {
          include: { manualAccount: true },
        },
        properties: {
          select: { id: true, uuid: true, name: true, address: true },
        },
      },
    });
    return record ? this.mapProfile(record) : null;
  }

  async findById(id: number): Promise<SplitProfileEntity | null> {
    const record = await (this.prisma as any).upward_pm_split_profile.findUnique({
      where: { id },
      include: {
        items: {
          include: { manualAccount: true },
        },
        properties: {
          select: { id: true, uuid: true, name: true, address: true },
        },
      },
    });
    return record ? this.mapProfile(record) : null;
  }

  async create(data: CreateSplitProfileData): Promise<SplitProfileEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      if (data.isDefault) {
        await tx.upward_pm_split_profile.updateMany({
          where: { pmId: data.pmId },
          data: { isDefault: false },
        });
      }

      const created = await tx.upward_pm_split_profile.create({
        data: {
          pmId: data.pmId,
          name: data.name,
          description: data.description || null,
          isDefault: data.isDefault || false,
          items: {
            create: data.items.map((it) => ({
              manualAccountId: it.manualAccountId,
              percentage: it.percentage,
              lineItemName: it.lineItemName || 'Rent',
            })),
          },
        },
        include: {
          items: {
            include: { manualAccount: true },
          },
          properties: {
            select: { id: true, uuid: true, name: true, address: true },
          },
        },
      });

      if (data.propertyUuids && data.propertyUuids.length > 0) {
        await tx.upward_pm_property.updateMany({
          where: { uuid: { in: data.propertyUuids }, pmId: data.pmId },
          data: { splitProfileId: created.id },
        });

        // Refetch with attached properties
        const refreshed = await tx.upward_pm_split_profile.findUnique({
          where: { id: created.id },
          include: {
            items: {
              include: { manualAccount: true },
            },
            properties: {
              select: { id: true, uuid: true, name: true, address: true },
            },
          },
        });
        return this.mapProfile(refreshed);
      }

      return this.mapProfile(created);
    });
  }

  async update(id: number, data: UpdateSplitProfileData): Promise<SplitProfileEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.upward_pm_split_profile.findUnique({
        where: { id },
      });

      if (data.isDefault && existing) {
        await tx.upward_pm_split_profile.updateMany({
          where: { pmId: existing.pmId, id: { not: id } },
          data: { isDefault: false },
        });
      }

      if (data.items) {
        // Replace items
        await tx.upward_pm_split_profile_item.deleteMany({
          where: { profileId: id },
        });
        await tx.upward_pm_split_profile_item.createMany({
          data: data.items.map((it) => ({
            profileId: id,
            manualAccountId: it.manualAccountId,
            percentage: it.percentage,
            lineItemName: it.lineItemName || 'Rent',
          })),
        });
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      const updated = await tx.upward_pm_split_profile.update({
        where: { id },
        data: updateData,
        include: {
          items: {
            include: { manualAccount: true },
          },
          properties: {
            select: { id: true, uuid: true, name: true, address: true },
          },
        },
      });

      return this.mapProfile(updated);
    });
  }

  async delete(id: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx: any) => {
      // Unlink properties
      await tx.upward_pm_property.updateMany({
        where: { splitProfileId: id },
        data: { splitProfileId: null },
      });

      // Delete items
      await tx.upward_pm_split_profile_item.deleteMany({
        where: { profileId: id },
      });

      // Delete profile
      await tx.upward_pm_split_profile.delete({
        where: { id },
      });

      return true;
    });
  }

  async attachToProperties(profileId: number, pmId: number, propertyUuids: string[]): Promise<boolean> {
    return this.prisma.$transaction(async (tx: any) => {
      // Unlink properties previously attached to this profile that are not in the new set
      const properties = await tx.upward_pm_property.findMany({
        where: { uuid: { in: propertyUuids }, pmId },
        select: { id: true },
      });
      const targetIds = properties.map((p: any) => p.id);

      // Unlink removed properties
      await tx.upward_pm_property.updateMany({
        where: { splitProfileId: profileId, id: { notIn: targetIds } },
        data: { splitProfileId: null },
      });

      // Link newly selected properties
      if (targetIds.length > 0) {
        await tx.upward_pm_property.updateMany({
          where: { id: { in: targetIds } },
          data: { splitProfileId: profileId },
        });
      }

      return true;
    });
  }

  async detachProperty(propertyUuid: string, pmId: number): Promise<boolean> {
    await (this.prisma as any).upward_pm_property.updateMany({
      where: { uuid: propertyUuid, pmId },
      data: { splitProfileId: null },
    });
    return true;
  }
}
