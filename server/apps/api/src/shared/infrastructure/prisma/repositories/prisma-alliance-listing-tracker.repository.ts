import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IAllianceListingTrackerRepository } from '../../../../domains/alliance/alliance.repository.interface';
import { AllianceListingTrackerEntity } from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceListingTrackerRepository implements IAllianceListingTrackerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): AllianceListingTrackerEntity {
    return {
      id: item.id,
      uuid: item.uuid,
      listingId: item.listingId,
      trackerPmId: item.trackerPmId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async track(listingId: number, trackerPmId: number): Promise<AllianceListingTrackerEntity> {
    const item = await (this.prisma as any).upward_alliance_listing_tracker.upsert({
      where: {
        listingId_trackerPmId: {
          listingId,
          trackerPmId,
        },
      },
      create: {
        listingId,
        trackerPmId,
      },
      update: {},
    });

    return this.mapToEntity(item);
  }

  async untrack(listingId: number, trackerPmId: number): Promise<boolean> {
    const result = await (this.prisma as any).upward_alliance_listing_tracker.deleteMany({
      where: {
        listingId,
        trackerPmId,
      },
    });

    return result.count > 0;
  }

  async isTracked(listingId: number, trackerPmId: number): Promise<boolean> {
    const item = await (this.prisma as any).upward_alliance_listing_tracker.findUnique({
      where: {
        listingId_trackerPmId: {
          listingId,
          trackerPmId,
        },
      },
      select: { id: true },
    });

    return Boolean(item);
  }

  async countByListingId(listingId: number): Promise<number> {
    return (this.prisma as any).upward_alliance_listing_tracker.count({
      where: { listingId },
    });
  }

  async countByListingIds(listingIds: number[]): Promise<Map<number, number>> {
    if (listingIds.length === 0) return new Map();

    const groups = await (this.prisma as any).upward_alliance_listing_tracker.groupBy({
      by: ['listingId'],
      where: {
        listingId: { in: listingIds },
      },
      _count: {
        id: true,
      },
    });

    const counts = new Map<number, number>();
    for (const g of groups) {
      counts.set(g.listingId, g._count.id);
    }
    return counts;
  }

  async findTrackedListingIdsByPm(pmId: number, listingIds: number[]): Promise<Set<number>> {
    if (listingIds.length === 0) return new Set();

    const items = await (this.prisma as any).upward_alliance_listing_tracker.findMany({
      where: {
        trackerPmId: pmId,
        listingId: { in: listingIds },
      },
      select: {
        listingId: true,
      },
    });

    return new Set(items.map((i: any) => i.listingId));
  }

  async findByListingAndPm(listingId: number, trackerPmId: number): Promise<AllianceListingTrackerEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing_tracker.findUnique({
      where: {
        listingId_trackerPmId: {
          listingId,
          trackerPmId,
        },
      },
    });

    return item ? this.mapToEntity(item) : null;
  }
}
