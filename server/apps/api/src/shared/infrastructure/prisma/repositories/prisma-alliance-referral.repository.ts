import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import {
  IAllianceReferralRepository,
  CreateAllianceReferralData,
  UpdateAllianceReferralData,
} from '../../../../domains/alliance/alliance.repository.interface';
import {
  AllianceReferralEntity,
  AllianceReferralStatus,
  AllianceLeadStage,
} from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceReferralRepository implements IAllianceReferralRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private mapToEntity(item: any): AllianceReferralEntity {
    return {
      id: item.id,
      uuid: item.uuid,
      listingId: item.listingId,
      referringPmId: item.referringPmId,
      matchedUserId: item.matchedUserId,
      clientIdentityKey: item.clientIdentityKey,
      clientName: item.clientName,
      clientEmail: item.clientEmail,
      clientPhone: item.clientPhone,
      clientNormalizedEmail: item.clientNormalizedEmail,
      clientNormalizedPhone: item.clientNormalizedPhone,
      shareToken: item.shareToken,
      status: item.status as AllianceReferralStatus,
      stage: item.stage as AllianceLeadStage,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      convertedAt: item.convertedAt,
      closedAt: item.closedAt,
      listing: item.listing
        ? {
            id: item.listing.id,
            uuid: item.listing.uuid,
            pmId: item.listing.pmId,
            sourceType: item.listing.sourceType,
            targetType: item.listing.targetType,
            intent: item.listing.intent,
            status: item.listing.status,
            visibility: item.listing.visibility,
            targetPropertyId: item.listing.targetPropertyId,
            targetUnitId: item.listing.targetUnitId,
            isSourceDeleted: item.listing.isSourceDeleted,
            sourceDeletedAt: item.listing.sourceDeletedAt,
            title: item.listing.title,
            description: item.listing.description,
            currency: item.listing.currency,
            price: item.listing.price,
            address: item.listing.address,
            city: item.listing.city,
            state: item.listing.state,
            country: item.listing.country,
            propertyType: item.listing.propertyType,
            bedrooms: item.listing.bedrooms,
            bathrooms: item.listing.bathrooms,
            createdAt: item.listing.createdAt,
            updatedAt: item.listing.updatedAt,
            publishedAt: item.listing.publishedAt,
            unpublishedAt: item.listing.unpublishedAt,
            archivedAt: item.listing.archivedAt,
            media: item.listing.media
              ? item.listing.media.map((m: any) => ({
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
            pm: item.listing.pm
              ? {
                  id: item.listing.pm.id,
                  uuid: item.listing.pm.uuid,
                  name:
                    (item.listing.pm.businessName ? this.encryption.decrypt(item.listing.pm.businessName) : '') ||
                    `${item.listing.pm.firstName ? this.encryption.decrypt(item.listing.pm.firstName) : ''} ${item.listing.pm.lastName ? this.encryption.decrypt(item.listing.pm.lastName) : ''}`.trim() ||
                    'Property Manager',
                  companyName: item.listing.pm.businessName ? this.encryption.decrypt(item.listing.pm.businessName) : null,
                }
              : undefined,
          }
        : undefined,
      referringPm: item.referringPm
        ? {
            id: item.referringPm.id,
            uuid: item.referringPm.uuid,
            name:
              (item.referringPm.businessName ? this.encryption.decrypt(item.referringPm.businessName) : '') ||
              `${item.referringPm.firstName ? this.encryption.decrypt(item.referringPm.firstName) : ''} ${item.referringPm.lastName ? this.encryption.decrypt(item.referringPm.lastName) : ''}`.trim() ||
              'Property Manager',
            companyName: item.referringPm.businessName ? this.encryption.decrypt(item.referringPm.businessName) : null,
          }
        : undefined,
      matchedUser: item.matchedUser
        ? {
            id: item.matchedUser.id,
            uuid: item.matchedUser.uuid,
            firstName: item.matchedUser.firstName,
            lastName: item.matchedUser.lastName,
            email: item.matchedUser.email,
            phone: item.matchedUser.phone,
          }
        : null,
    };
  }

  private get standardInclude() {
    return {
      listing: {
        include: {
          media: { orderBy: { sortOrder: 'asc' } },
          pm: {
            select: {
              id: true,
              uuid: true,
              firstName: true,
              lastName: true,
              businessName: true,
            },
          },
        },
      },
      referringPm: {
        select: {
          id: true,
          uuid: true,
          firstName: true,
          lastName: true,
          businessName: true,
        },
      },
      matchedUser: {
        select: {
          id: true,
          uuid: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    };
  }

  async create(data: CreateAllianceReferralData): Promise<AllianceReferralEntity> {
    const created = await (this.prisma as any).upward_alliance_referral.create({
      data: {
        listingId: data.listingId,
        referringPmId: data.referringPmId,
        matchedUserId: data.matchedUserId ?? null,
        clientIdentityKey: data.clientIdentityKey,
        clientName: data.clientName,
        clientEmail: data.clientEmail ?? null,
        clientPhone: data.clientPhone ?? null,
        clientNormalizedEmail: data.clientNormalizedEmail ?? null,
        clientNormalizedPhone: data.clientNormalizedPhone ?? null,
        shareToken: data.shareToken,
        status: data.status || 'ACTIVE',
        stage: data.stage || 'NEW',
        notes: data.notes ?? null,
      },
      include: this.standardInclude,
    });

    return this.mapToEntity(created);
  }

  async findById(id: number): Promise<AllianceReferralEntity | null> {
    const item = await (this.prisma as any).upward_alliance_referral.findUnique({
      where: { id },
      include: this.standardInclude,
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findByUuid(uuid: string): Promise<AllianceReferralEntity | null> {
    const item = await (this.prisma as any).upward_alliance_referral.findUnique({
      where: { uuid },
      include: this.standardInclude,
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findByShareToken(shareToken: string): Promise<AllianceReferralEntity | null> {
    const item = await (this.prisma as any).upward_alliance_referral.findUnique({
      where: { shareToken },
      include: this.standardInclude,
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findActiveReferral(listingId: number, clientIdentityKey: string): Promise<AllianceReferralEntity | null> {
    const item = await (this.prisma as any).upward_alliance_referral.findFirst({
      where: {
        listingId,
        clientIdentityKey,
        status: 'ACTIVE',
      },
      include: this.standardInclude,
    });

    return item ? this.mapToEntity(item) : null;
  }

  async update(id: number, data: UpdateAllianceReferralData): Promise<AllianceReferralEntity> {
    const updated = await (this.prisma as any).upward_alliance_referral.update({
      where: { id },
      data: {
        ...data,
      },
      include: this.standardInclude,
    });

    return this.mapToEntity(updated);
  }

  async findPmReferrals(
    pmId: number,
    options?: {
      stage?: AllianceLeadStage;
      status?: AllianceReferralStatus;
      listingUuid?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: AllianceReferralEntity[]; total: number }> {
    const where: any = { referringPmId: pmId };

    if (options?.stage) {
      where.stage = options.stage;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.listingUuid) {
      where.listing = { uuid: options.listingUuid };
    }
    if (options?.search && options.search.trim().length > 0) {
      const s = options.search.trim();
      where.OR = [
        { clientName: { contains: s, mode: 'insensitive' } },
        { clientEmail: { contains: s, mode: 'insensitive' } },
        { clientPhone: { contains: s, mode: 'insensitive' } },
        { listing: { title: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).upward_alliance_referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.take,
        include: this.standardInclude,
      }),
      (this.prisma as any).upward_alliance_referral.count({ where }),
    ]);

    return {
      items: items.map((item: any) => this.mapToEntity(item)),
      total,
    };
  }

  async countActiveByListingId(listingId: number): Promise<number> {
    return (this.prisma as any).upward_alliance_referral.count({
      where: {
        listingId,
        status: 'ACTIVE',
      },
    });
  }

  async findActiveReferralsByListingId(listingId: number): Promise<AllianceReferralEntity[]> {
    const items = await (this.prisma as any).upward_alliance_referral.findMany({
      where: {
        listingId,
        status: 'ACTIVE',
      },
      include: this.standardInclude,
    });

    return items.map((item: any) => this.mapToEntity(item));
  }
}
