import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import {
  IAllianceCommissionRepository,
  CreateAllianceCommissionData,
  ListAllianceCommissionsFilter,
} from '../../../../domains/alliance/alliance.repository.interface';
import {
  AllianceCommissionEntity,
  AllianceCommissionStatus,
  AllianceCommissionType,
} from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceCommissionRepository implements IAllianceCommissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private mapToEntity(item: any): AllianceCommissionEntity {
    return {
      id: item.id,
      uuid: item.uuid,
      referralId: item.referralId,
      referringPmId: item.referringPmId,
      listingId: item.listingId,
      sourceTransactionId: item.sourceTransactionId,
      sourceRentPaymentId: item.sourceRentPaymentId,
      transactionReference: item.transactionReference,
      commissionType: item.commissionType as AllianceCommissionType,
      sourceAmount: item.sourceAmount,
      commissionRate: item.commissionRate,
      commissionAmount: item.commissionAmount,
      currency: item.currency,
      status: item.status as AllianceCommissionStatus,
      notes: item.notes,
      earnedAt: item.earnedAt,
      payableAt: item.payableAt,
      paidAt: item.paidAt,
      reversedAt: item.reversedAt,
      reversalReason: item.reversalReason,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      referral: item.referral
        ? {
            id: item.referral.id,
            uuid: item.referral.uuid,
            listingId: item.referral.listingId,
            referringPmId: item.referral.referringPmId,
            matchedUserId: item.referral.matchedUserId,
            clientIdentityKey: item.referral.clientIdentityKey,
            clientName: item.referral.clientName,
            clientEmail: item.referral.clientEmail,
            clientPhone: item.referral.clientPhone,
            clientNormalizedEmail: item.referral.clientNormalizedEmail,
            clientNormalizedPhone: item.referral.clientNormalizedPhone,
            shareToken: item.referral.shareToken,
            status: item.referral.status,
            stage: item.referral.stage,
            notes: item.referral.notes,
            createdAt: item.referral.createdAt,
            updatedAt: item.referral.updatedAt,
            convertedAt: item.referral.convertedAt,
            closedAt: item.referral.closedAt,
          }
        : undefined,
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
          }
        : undefined,
      referringPm: item.referringPm
        ? {
            id: item.referringPm.id,
            uuid: item.referringPm.uuid,
            name:
              (item.referringPm.businessName ? this.encryption.decrypt(item.referringPm.businessName) : '') ||
              `${item.referringPm.firstName ? this.encryption.decrypt(item.referringPm.firstName) : ''} ${item.referringPm.lastName ? this.encryption.decrypt(item.referringPm.lastName) : ''}`.trim() ||
              'Referring PM',
            companyName: item.referringPm.businessName ? this.encryption.decrypt(item.referringPm.businessName) : null,
          }
        : undefined,
    };
  }

  async create(data: CreateAllianceCommissionData): Promise<AllianceCommissionEntity> {
    const created = await (this.prisma as any).upward_alliance_commission.create({
      data: {
        referralId: data.referralId,
        referringPmId: data.referringPmId,
        listingId: data.listingId,
        sourceTransactionId: data.sourceTransactionId,
        sourceRentPaymentId: data.sourceRentPaymentId,
        transactionReference: data.transactionReference,
        commissionType: data.commissionType || 'PERCENTAGE',
        sourceAmount: data.sourceAmount,
        commissionRate: data.commissionRate ?? 5.0,
        commissionAmount: data.commissionAmount,
        currency: data.currency || 'NGN',
        status: data.status || 'EARNED',
        notes: data.notes,
        earnedAt: data.earnedAt || new Date(),
        payableAt: data.payableAt,
        paidAt: data.paidAt,
      },
      include: {
        referral: true,
        listing: true,
        referringPm: true,
      },
    });

    return this.mapToEntity(created);
  }

  async findById(id: number): Promise<AllianceCommissionEntity | null> {
    const found = await (this.prisma as any).upward_alliance_commission.findUnique({
      where: { id },
      include: {
        referral: true,
        listing: true,
        referringPm: true,
      },
    });

    return found ? this.mapToEntity(found) : null;
  }

  async findByUuid(uuid: string): Promise<AllianceCommissionEntity | null> {
    const found = await (this.prisma as any).upward_alliance_commission.findUnique({
      where: { uuid },
      include: {
        referral: true,
        listing: true,
        referringPm: true,
      },
    });

    return found ? this.mapToEntity(found) : null;
  }

  async findByReferralAndTxRef(
    referralId: number,
    transactionReference: string,
  ): Promise<AllianceCommissionEntity | null> {
    const found = await (this.prisma as any).upward_alliance_commission.findFirst({
      where: {
        referralId,
        transactionReference,
      },
      include: {
        referral: true,
        listing: true,
        referringPm: true,
      },
    });

    return found ? this.mapToEntity(found) : null;
  }

  async listByReferringPm(
    pmId: number,
    filter?: ListAllianceCommissionsFilter,
  ): Promise<{ items: AllianceCommissionEntity[]; total: number }> {
    const where: any = {
      referringPmId: pmId,
    };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.listingUuid) {
      where.listing = { uuid: filter.listingUuid };
    }

    if (filter?.startDate || filter?.endDate) {
      where.earnedAt = {};
      if (filter.startDate) where.earnedAt.gte = filter.startDate;
      if (filter.endDate) where.earnedAt.lte = filter.endDate;
    }

    if (filter?.search) {
      where.OR = [
        { transactionReference: { contains: filter.search, mode: 'insensitive' } },
        { listing: { title: { contains: filter.search, mode: 'insensitive' } } },
        { referral: { clientName: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    const [total, rawItems] = await Promise.all([
      (this.prisma as any).upward_alliance_commission.count({ where }),
      (this.prisma as any).upward_alliance_commission.findMany({
        where,
        skip: filter?.skip ?? 0,
        take: filter?.take ?? 20,
        orderBy: { earnedAt: 'desc' },
        include: {
          referral: true,
          listing: true,
          referringPm: true,
        },
      }),
    ]);

    return {
      items: rawItems.map((item: any) => this.mapToEntity(item)),
      total,
    };
  }

  async getPmCommissionStats(
    pmId: number,
  ): Promise<{ totalEarned: number; totalPayable: number; totalPaid: number; totalPending: number; count: number }> {
    const commissions = await (this.prisma as any).upward_alliance_commission.findMany({
      where: { referringPmId: pmId },
      select: {
        status: true,
        commissionAmount: true,
      },
    });

    let totalEarned = 0;
    let totalPayable = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const c of commissions) {
      if (c.status === 'EARNED' || c.status === 'PAYABLE' || c.status === 'PAID') {
        totalEarned += c.commissionAmount;
      }
      if (c.status === 'PAYABLE') {
        totalPayable += c.commissionAmount;
      }
      if (c.status === 'PAID') {
        totalPaid += c.commissionAmount;
      }
      if (c.status === 'PENDING') {
        totalPending += c.commissionAmount;
      }
    }

    // Deterministic rounding to 2 decimal places
    return {
      totalEarned: Math.round(totalEarned * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      count: commissions.length,
    };
  }

  async updateStatus(
    id: number,
    status: AllianceCommissionStatus,
    extra?: { payableAt?: Date; paidAt?: Date; reversedAt?: Date; reversalReason?: string; notes?: string },
  ): Promise<AllianceCommissionEntity> {
    const updated = await (this.prisma as any).upward_alliance_commission.update({
      where: { id },
      data: {
        status,
        ...(extra?.payableAt !== undefined && { payableAt: extra.payableAt }),
        ...(extra?.paidAt !== undefined && { paidAt: extra.paidAt }),
        ...(extra?.reversedAt !== undefined && { reversedAt: extra.reversedAt }),
        ...(extra?.reversalReason !== undefined && { reversalReason: extra.reversalReason }),
        ...(extra?.notes !== undefined && { notes: extra.notes }),
      },
      include: {
        referral: true,
        listing: true,
        referringPm: true,
      },
    });

    return this.mapToEntity(updated);
  }
}
