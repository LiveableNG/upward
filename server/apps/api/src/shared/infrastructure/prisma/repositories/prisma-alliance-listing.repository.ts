import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IAllianceListingRepository,
  CreateAllianceListingData,
  UpdateAllianceListingData,
} from '../../../../domains/alliance/alliance.repository.interface';
import {
  AllianceListingEntity,
  AllianceListingStatus,
  AllianceSourceType,
  AllianceTargetType,
} from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceListingRepository implements IAllianceListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): AllianceListingEntity {
    return {
      id: item.id,
      uuid: item.uuid,
      pmId: item.pmId,
      sourceType: item.sourceType as AllianceSourceType,
      targetType: item.targetType as AllianceTargetType,
      intent: item.intent,
      status: item.status as AllianceListingStatus,
      targetPropertyId: item.targetPropertyId,
      targetUnitId: item.targetUnitId,
      isSourceDeleted: item.isSourceDeleted,
      sourceDeletedAt: item.sourceDeletedAt,
      title: item.title,
      description: item.description,
      currency: item.currency,
      price: item.price,
      address: item.address,
      city: item.city,
      state: item.state,
      country: item.country,
      propertyType: item.propertyType,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      publishedAt: item.publishedAt,
      unpublishedAt: item.unpublishedAt,
      archivedAt: item.archivedAt,
      targetProperty: item.targetProperty
        ? {
            id: item.targetProperty.id,
            uuid: item.targetProperty.uuid,
            name: item.targetProperty.name,
            address: item.targetProperty.address,
          }
        : null,
      targetUnit: item.targetUnit
        ? {
            id: item.targetUnit.id,
            uuid: item.targetUnit.uuid,
            unitName: item.targetUnit.unitName,
            rentAmount: item.targetUnit.rentAmount,
            propertyId: item.targetUnit.propertyId,
            property: item.targetUnit.property
              ? {
                  id: item.targetUnit.property.id,
                  uuid: item.targetUnit.property.uuid,
                  name: item.targetUnit.property.name,
                }
              : undefined,
          }
        : null,
      media: item.media
        ? item.media.map((m: any) => ({
            id: m.id,
            uuid: m.uuid,
            listingId: m.listingId,
            storageKey: m.storageKey,
            publicUrl: m.publicUrl,
            mimeType: m.mimeType,
            fileSize: m.fileSize,
            sortOrder: m.sortOrder,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          }))
        : [],
    };
  }

  async create(data: CreateAllianceListingData): Promise<AllianceListingEntity> {
    const created = await (this.prisma as any).upward_alliance_listing.create({
      data: {
        pmId: data.pmId,
        sourceType: data.sourceType,
        targetType: data.targetType,
        intent: data.intent || 'RENT',
        status: 'DRAFT',
        targetPropertyId: data.targetPropertyId ?? null,
        targetUnitId: data.targetUnitId ?? null,
        title: data.title,
        description: data.description ?? null,
        currency: data.currency || 'NGN',
        price: data.price ?? 0,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        country: data.country || 'Nigeria',
        propertyType: data.propertyType ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
      },
      include: {
        targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
        targetUnit: {
          select: {
            id: true,
            uuid: true,
            unitName: true,
            rentAmount: true,
            propertyId: true,
            property: { select: { id: true, uuid: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return this.mapToEntity(created);
  }

  async findById(id: number): Promise<AllianceListingEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing.findUnique({
      where: { id },
      include: {
        targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
        targetUnit: {
          select: {
            id: true,
            uuid: true,
            unitName: true,
            rentAmount: true,
            propertyId: true,
            property: { select: { id: true, uuid: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findByUuid(uuid: string): Promise<AllianceListingEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing.findUnique({
      where: { uuid },
      include: {
        targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
        targetUnit: {
          select: {
            id: true,
            uuid: true,
            unitName: true,
            rentAmount: true,
            propertyId: true,
            property: { select: { id: true, uuid: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findPublishedByTargetProperty(targetPropertyId: number): Promise<AllianceListingEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing.findFirst({
      where: {
        targetPropertyId,
        status: 'PUBLISHED',
      },
      include: {
        targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findPublishedByTargetUnit(targetUnitId: number): Promise<AllianceListingEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing.findFirst({
      where: {
        targetUnitId,
        status: 'PUBLISHED',
      },
      include: {
        targetUnit: {
          select: {
            id: true,
            uuid: true,
            unitName: true,
            rentAmount: true,
            propertyId: true,
            property: { select: { id: true, uuid: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async update(id: number, data: UpdateAllianceListingData): Promise<AllianceListingEntity> {
    const updated = await (this.prisma as any).upward_alliance_listing.update({
      where: { id },
      data: {
        ...data,
      },
      include: {
        targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
        targetUnit: {
          select: {
            id: true,
            uuid: true,
            unitName: true,
            rentAmount: true,
            propertyId: true,
            property: { select: { id: true, uuid: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return this.mapToEntity(updated);
  }

  async findPmListings(
    pmId: number,
    options?: {
      status?: AllianceListingStatus;
      targetType?: AllianceTargetType;
      sourceType?: AllianceSourceType;
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: AllianceListingEntity[]; total: number }> {
    const where: any = { pmId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.targetType) {
      where.targetType = options.targetType;
    }
    if (options?.sourceType) {
      where.sourceType = options.sourceType;
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).upward_alliance_listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.take,
        include: {
          targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
          targetUnit: {
            select: {
              id: true,
              uuid: true,
              unitName: true,
              rentAmount: true,
              propertyId: true,
              property: { select: { id: true, uuid: true, name: true } },
            },
          },
          media: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      (this.prisma as any).upward_alliance_listing.count({ where }),
    ]);

    return {
      items: items.map((i: any) => this.mapToEntity(i)),
      total,
    };
  }

  async deleteDraft(id: number): Promise<boolean> {
    await (this.prisma as any).upward_alliance_listing.delete({
      where: { id },
    });
    return true;
  }
}
