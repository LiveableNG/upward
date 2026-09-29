import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IAllianceRatingRepository,
  CreateAllianceRatingData,
} from '../../../../domains/alliance/alliance.repository.interface';
import {
  AllianceRatingEntity,
  AllianceRatingAuthorType,
  AllianceRatingSubjectType,
  AllianceRatingSummaryEntity,
} from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceRatingRepository implements IAllianceRatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): AllianceRatingEntity {
    return {
      id: item.id,
      uuid: item.uuid,
      referralId: item.referralId,
      authorType: item.authorType as AllianceRatingAuthorType,
      authorPmId: item.authorPmId,
      authorUserId: item.authorUserId,
      subjectType: item.subjectType as AllianceRatingSubjectType,
      subjectPmId: item.subjectPmId,
      subjectUserId: item.subjectUserId,
      subjectListingId: item.subjectListingId,
      score: item.score,
      review: item.review,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      authorPm: item.authorPm
        ? {
            id: item.authorPm.id,
            uuid: item.authorPm.uuid,
            name:
              item.authorPm.companyName ||
              `${item.authorPm.firstName || ''} ${item.authorPm.lastName || ''}`.trim() ||
              'Property Manager',
            companyName: item.authorPm.companyName,
          }
        : null,
      authorUser: item.authorUser
        ? {
            id: item.authorUser.id,
            uuid: item.authorUser.uuid,
            firstName: item.authorUser.firstName,
            lastName: item.authorUser.lastName,
          }
        : null,
      subjectPm: item.subjectPm
        ? {
            id: item.subjectPm.id,
            uuid: item.subjectPm.uuid,
            name:
              item.subjectPm.companyName ||
              `${item.subjectPm.firstName || ''} ${item.subjectPm.lastName || ''}`.trim() ||
              'Property Manager',
            companyName: item.subjectPm.companyName,
          }
        : null,
      subjectUser: item.subjectUser
        ? {
            id: item.subjectUser.id,
            uuid: item.subjectUser.uuid,
            firstName: item.subjectUser.firstName,
            lastName: item.subjectUser.lastName,
          }
        : null,
      subjectListing: item.subjectListing
        ? {
            id: item.subjectListing.id,
            uuid: item.subjectListing.uuid,
            title: item.subjectListing.title,
          }
        : null,
    };
  }

  async create(data: CreateAllianceRatingData): Promise<AllianceRatingEntity> {
    const created = await (this.prisma as any).upward_alliance_rating.create({
      data: {
        referralId: data.referralId,
        authorType: data.authorType,
        authorPmId: data.authorPmId,
        authorUserId: data.authorUserId,
        subjectType: data.subjectType,
        subjectPmId: data.subjectPmId,
        subjectUserId: data.subjectUserId,
        subjectListingId: data.subjectListingId,
        score: data.score,
        review: data.review,
      },
      include: {
        authorPm: true,
        authorUser: true,
        subjectPm: true,
        subjectUser: true,
        subjectListing: true,
      },
    });

    return this.mapToEntity(created);
  }

  async findByReferralAndAuthor(
    referralId: number,
    authorType: AllianceRatingAuthorType,
    authorId: number,
  ): Promise<AllianceRatingEntity | null> {
    const where: any = {
      referralId,
      authorType,
    };

    if (authorType === 'PM') {
      where.authorPmId = authorId;
    } else {
      where.authorUserId = authorId;
    }

    const found = await (this.prisma as any).upward_alliance_rating.findFirst({
      where,
      include: {
        authorPm: true,
        authorUser: true,
        subjectPm: true,
        subjectUser: true,
        subjectListing: true,
      },
    });

    return found ? this.mapToEntity(found) : null;
  }

  async getRatingSummaryForSubject(
    subjectType: AllianceRatingSubjectType,
    subjectId: number,
  ): Promise<AllianceRatingSummaryEntity> {
    const where: any = {
      subjectType,
    };

    if (subjectType === 'PM') {
      where.subjectPmId = subjectId;
    } else if (subjectType === 'CLIENT') {
      where.subjectUserId = subjectId;
    } else {
      where.subjectListingId = subjectId;
    }

    const ratings = await (this.prisma as any).upward_alliance_rating.findMany({
      where,
      select: { score: true },
    });

    const distribution: { 1: number; 2: number; 3: number; 4: number; 5: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalScore = 0;
    for (const r of ratings) {
      totalScore += r.score;
      if (r.score >= 1 && r.score <= 5) {
        distribution[r.score as 1 | 2 | 3 | 4 | 5]++;
      }
    }

    const totalRatings = ratings.length;
    const averageScore = totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;

    return {
      averageScore,
      totalRatings,
      distribution,
    };
  }

  async listRatingsForSubject(
    subjectType: AllianceRatingSubjectType,
    subjectId: number,
    options?: { skip?: number; take?: number },
  ): Promise<{ items: AllianceRatingEntity[]; total: number }> {
    const where: any = {
      subjectType,
    };

    if (subjectType === 'PM') {
      where.subjectPmId = subjectId;
    } else if (subjectType === 'CLIENT') {
      where.subjectUserId = subjectId;
    } else {
      where.subjectListingId = subjectId;
    }

    const [total, rawItems] = await Promise.all([
      (this.prisma as any).upward_alliance_rating.count({ where }),
      (this.prisma as any).upward_alliance_rating.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          authorPm: true,
          authorUser: true,
          subjectPm: true,
          subjectUser: true,
          subjectListing: true,
        },
      }),
    ]);

    return {
      items: rawItems.map((item: any) => this.mapToEntity(item)),
      total,
    };
  }
}
