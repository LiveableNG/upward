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
  AllianceListingVisibility,
  AllianceSourceType,
  AllianceTargetType,
  AllianceListingIntent,
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
      visibility: (item.visibility || 'ALLIANCE') as AllianceListingVisibility,
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
            status: item.targetUnit.status,
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
      pm: item.pm
        ? {
            id: item.pm.id,
            uuid: item.pm.uuid,
            name: item.pm.companyName || `${item.pm.firstName || ''} ${item.pm.lastName || ''}`.trim() || 'Property Manager',
            companyName: item.pm.companyName,
            allianceProfile: item.pm.allianceProfile
              ? {
                  pmTitle: item.pm.allianceProfile.pmTitle,
                  bio: item.pm.allianceProfile.bio,
                  isEnabled: item.pm.allianceProfile.isEnabled,
                }
              : null,
            qualifications: item.pm.qualifications
              ? item.pm.qualifications
                  .filter((q: any) => q.qualification?.isActive)
                  .map((q: any) => ({
                    qualification: {
                      id: q.qualification.id,
                      uuid: q.qualification.uuid,
                      name: q.qualification.name,
                      slug: q.qualification.slug,
                      isActive: q.qualification.isActive,
                    },
                  }))
              : [],
          }
        : undefined,
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
        visibility: data.visibility || 'ALLIANCE',
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
            status: true,
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

  async findDiscoverableListings(
    excludePmId: number,
    options?: {
      intent?: AllianceListingIntent;
      targetType?: AllianceTargetType;
      propertyType?: string;
      city?: string;
      state?: string;
      search?: string;
      sortBy?: 'newest' | 'price_asc' | 'price_desc';
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: AllianceListingEntity[]; total: number }> {
    const where: any = {
      status: 'PUBLISHED',
      visibility: 'ALLIANCE',
      isSourceDeleted: false,
      pmId: { not: excludePmId },
      pm: {
        allianceProfile: {
          isEnabled: true,
        },
      },
    };

    if (options?.intent) {
      where.intent = options.intent;
    }
    if (options?.targetType) {
      where.targetType = options.targetType;
    }
    if (options?.propertyType) {
      where.propertyType = { contains: options.propertyType, mode: 'insensitive' };
    }
    if (options?.city) {
      where.city = { contains: options.city, mode: 'insensitive' };
    }
    if (options?.state) {
      where.state = { contains: options.state, mode: 'insensitive' };
    }
    if (options?.search && options.search.trim().length > 0) {
      const s = options.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { state: { contains: s, mode: 'insensitive' } },
        { address: { contains: s, mode: 'insensitive' } },
        { propertyType: { contains: s, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    if (options?.sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (options?.sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).upward_alliance_listing.findMany({
        where,
        orderBy,
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
              status: true,
              propertyId: true,
              property: { select: { id: true, uuid: true, name: true } },
            },
          },
          media: { orderBy: { sortOrder: 'asc' } },
          pm: {
            select: {
              id: true,
              uuid: true,
              firstName: true,
              lastName: true,
              companyName: true,
              allianceProfile: {
                select: {
                  pmTitle: true,
                  bio: true,
                  isEnabled: true,
                },
              },
              qualifications: {
                include: {
                  qualification: true,
                },
              },
            },
          },
        },
      }),
      (this.prisma as any).upward_alliance_listing.count({ where }),
    ]);

    return {
      items: items.map((i: any) => this.mapToEntity(i)),
      total,
    };
  }

  async findDiscoverableByUuid(uuid: string, excludePmId?: number): Promise<AllianceListingEntity | null> {
    const where: any = {
      uuid,
      status: 'PUBLISHED',
      visibility: 'ALLIANCE',
      isSourceDeleted: false,
      pm: {
        allianceProfile: {
          isEnabled: true,
        },
      },
    };

    if (excludePmId) {
      where.pmId = { not: excludePmId };
    }

    const item = await (this.prisma as any).upward_alliance_listing.findFirst({
      where,
      include: {
        targetProperty: { select: { id: true, uuid: true, name: true, address: true } },
        targetUnit: {
          select: {
            id: true,
            uuid: true,
            unitName: true,
            rentAmount: true,
            status: true,
            propertyId: true,
            property: { select: { id: true, uuid: true, name: true } },
          },
        },
        media: { orderBy: { sortOrder: 'asc' } },
        pm: {
          select: {
            id: true,
            uuid: true,
            firstName: true,
            lastName: true,
            companyName: true,
            allianceProfile: {
              select: {
                pmTitle: true,
                bio: true,
                isEnabled: true,
              },
            },
            qualifications: {
              include: {
                qualification: true,
              },
            },
          },
        },
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async deleteDraft(id: number): Promise<boolean> {
    await (this.prisma as any).upward_alliance_listing.delete({
      where: { id },
    });
    return true;
  }
}
