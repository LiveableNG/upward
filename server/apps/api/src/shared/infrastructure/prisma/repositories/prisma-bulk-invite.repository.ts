import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IBulkInviteRepository, BulkInvite, BulkInviteItem } from '../../../../domains/pm/IBulkInviteRepository';

@Injectable()
export class PrismaBulkInviteRepository implements IBulkInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any): Promise<BulkInvite> {
    const { items, ...rest } = data;
    const bulkInvite = await this.prisma.upward_pm_bulk_invite.create({
      data: {
        ...rest,
        items: items ? {
          create: items.map(({ bulkInviteId, ...item }: any) => item)
        } : undefined
      },
      include: {
        items: true
      }
    });

    return bulkInvite as any;
  }

  async update(id: string, data: Partial<BulkInvite>): Promise<BulkInvite> {
    const bulkInvite = await this.prisma.upward_pm_bulk_invite.update({
      where: { id },
      data: data as any,
      include: {
        items: true
      }
    });

    return bulkInvite as any;
  }

  async findById(id: string): Promise<BulkInvite | null> {
    const bulkInvite = await this.prisma.upward_pm_bulk_invite.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    return bulkInvite as any;
  }

  async findPending(): Promise<BulkInvite[]> {
    const bulkInvites = await this.prisma.upward_pm_bulk_invite.findMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return bulkInvites as any;
  }

  async updateItem(itemId: string, data: Partial<BulkInviteItem>): Promise<BulkInviteItem> {
    const item = await this.prisma.upward_pm_bulk_invite_item.update({
      where: { id: itemId },
      data: data as any
    });

    return item as any;
  }

  async createItem(data: Omit<BulkInviteItem, 'id'>): Promise<BulkInviteItem> {
    const item = await this.prisma.upward_pm_bulk_invite_item.create({
      data: data as any
    });

    return item as any;
  }
}
