import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  IAllianceListingMediaRepository,
  CreateAllianceListingMediaData,
} from '../../../../domains/alliance/alliance.repository.interface';
import { AllianceListingMediaEntity } from '../../../../domains/alliance/alliance.entity';

@Injectable()
export class PrismaAllianceListingMediaRepository implements IAllianceListingMediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): AllianceListingMediaEntity {
    return {
      id: item.id,
      uuid: item.uuid,
      listingId: item.listingId,
      storageKey: item.storageKey,
      publicUrl: item.publicUrl,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async create(data: CreateAllianceListingMediaData): Promise<AllianceListingMediaEntity> {
    const nextSortOrder =
      data.sortOrder !== undefined
        ? data.sortOrder
        : await this.countByListingId(data.listingId);

    const created = await (this.prisma as any).upward_alliance_listing_media.create({
      data: {
        listingId: data.listingId,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        sortOrder: nextSortOrder,
      },
    });

    return this.mapToEntity(created);
  }

  async findById(id: number): Promise<AllianceListingMediaEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing_media.findUnique({
      where: { id },
    });
    return item ? this.mapToEntity(item) : null;
  }

  async findByUuid(uuid: string): Promise<AllianceListingMediaEntity | null> {
    const item = await (this.prisma as any).upward_alliance_listing_media.findUnique({
      where: { uuid },
    });
    return item ? this.mapToEntity(item) : null;
  }

  async findByListingId(listingId: number): Promise<AllianceListingMediaEntity[]> {
    const items = await (this.prisma as any).upward_alliance_listing_media.findMany({
      where: { listingId },
      orderBy: { sortOrder: 'asc' },
    });
    return items.map((i: any) => this.mapToEntity(i));
  }

  async countByListingId(listingId: number): Promise<number> {
    return (this.prisma as any).upward_alliance_listing_media.count({
      where: { listingId },
    });
  }

  async reorder(listingId: number, orderedIds: number[]): Promise<AllianceListingMediaEntity[]> {
    return (this.prisma as any).$transaction(async (tx: any) => {
      // Set sequential sortOrder (0-indexed) for each item atomically
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.upward_alliance_listing_media.update({
          where: { id: orderedIds[i] },
          data: { sortOrder: i },
        });
      }

      const updatedItems = await tx.upward_alliance_listing_media.findMany({
        where: { listingId },
        orderBy: { sortOrder: 'asc' },
      });

      return updatedItems.map((item: any) => this.mapToEntity(item));
    });
  }

  async delete(id: number): Promise<boolean> {
    await (this.prisma as any).upward_alliance_listing_media.delete({
      where: { id },
    });
    return true;
  }

  async deleteByListingId(listingId: number): Promise<number> {
    const result = await (this.prisma as any).upward_alliance_listing_media.deleteMany({
      where: { listingId },
    });
    return result.count;
  }

  async reindexSortOrders(listingId: number): Promise<void> {
    await (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.upward_alliance_listing_media.findMany({
        where: { listingId },
        orderBy: { sortOrder: 'asc' },
      });

      for (let i = 0; i < existing.length; i++) {
        if (existing[i].sortOrder !== i) {
          await tx.upward_alliance_listing_media.update({
            where: { id: existing[i].id },
            data: { sortOrder: i },
          });
        }
      }
    });
  }
}
