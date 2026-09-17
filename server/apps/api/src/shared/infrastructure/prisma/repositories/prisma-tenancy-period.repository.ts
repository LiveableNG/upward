import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  TenancyPeriod,
  ITenancyPeriodRepository,
} from '../../../../domains/companies/tenancy-period.repository';

@Injectable()
export class PrismaTenancyPeriodRepository implements ITenancyPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: any): TenancyPeriod {
    return {
      id: model.id,
      uuid: model.uuid,
      userPropertyId: model.userPropertyId,
      startDate: model.startDate,
      endDate: model.endDate,
      rentAmount: model.rentAmount,
      currency: model.currency,
      sequenceNumber: model.sequenceNumber,
      isInitial: model.isInitial,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  async create(
    data: Omit<TenancyPeriod, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod> {
    const prisma = tx || this.prisma;
    const record = await (prisma as any).upward_tenancy_period.create({
      data: {
        userPropertyId: data.userPropertyId,
        startDate: data.startDate,
        endDate: data.endDate,
        rentAmount: data.rentAmount,
        currency: data.currency || 'NGN',
        sequenceNumber: data.sequenceNumber || 1,
        isInitial: data.isInitial || false,
        status: data.status || 'ACTIVE',
      },
    });
    return this.toDomain(record);
  }

  async update(
    id: number,
    data: Partial<TenancyPeriod>,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod> {
    const prisma = tx || this.prisma;
    const record = await (prisma as any).upward_tenancy_period.update({
      where: { id },
      data: {
        rentAmount: data.rentAmount,
        currency: data.currency,
        sequenceNumber: data.sequenceNumber,
        isInitial: data.isInitial,
        status: data.status,
      },
    });
    return this.toDomain(record);
  }

  async findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod | null> {
    const prisma = tx || this.prisma;
    const record = await (prisma as any).upward_tenancy_period.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByUuid(
    uuid: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod | null> {
    const prisma = tx || this.prisma;
    const record = await (prisma as any).upward_tenancy_period.findUnique({
      where: { uuid },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByUserPropertyId(
    userPropertyId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod[]> {
    const prisma = tx || this.prisma;
    const records = await (prisma as any).upward_tenancy_period.findMany({
      where: { userPropertyId },
      orderBy: { startDate: 'asc' },
    });
    return records.map((r: any) => this.toDomain(r));
  }

  async findInitialPeriod(
    userPropertyId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod | null> {
    const prisma = tx || this.prisma;
    const record = await (prisma as any).upward_tenancy_period.findFirst({
      where: { userPropertyId, isInitial: true },
      orderBy: { startDate: 'asc' },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByDates(
    userPropertyId: number,
    startDate: Date,
    endDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod | null> {
    const prisma = tx || this.prisma;
    const record = await (prisma as any).upward_tenancy_period.findFirst({
      where: {
        userPropertyId,
        startDate,
        endDate,
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async ensurePeriod(
    data: Omit<TenancyPeriod, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod> {
    const prisma = tx || this.prisma;
    const existing = await this.findByDates(data.userPropertyId, data.startDate, data.endDate, prisma);
    if (existing) {
      return existing;
    }

    // Determine sequence number if not explicitly set
    let sequenceNumber = data.sequenceNumber;
    if (!sequenceNumber || sequenceNumber <= 1) {
      const existingPeriods = await (prisma as any).upward_tenancy_period.findMany({
        where: { userPropertyId: data.userPropertyId },
        orderBy: { startDate: 'asc' },
      });
      if (existingPeriods.length > 0) {
        sequenceNumber = existingPeriods.length + 1;
      } else {
        sequenceNumber = 1;
      }
    }

    const record = await (prisma as any).upward_tenancy_period.create({
      data: {
        userPropertyId: data.userPropertyId,
        startDate: data.startDate,
        endDate: data.endDate,
        rentAmount: data.rentAmount,
        currency: data.currency || 'NGN',
        sequenceNumber,
        isInitial: data.isInitial || false,
        status: data.status || 'ACTIVE',
      },
    });
    return this.toDomain(record);
  }
}
