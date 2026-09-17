import { Prisma } from '@prisma/client';

export interface TenancyPeriod {
  id?: number;
  uuid: string;
  userPropertyId: number;
  startDate: Date;
  endDate: Date;
  rentAmount?: number | null;
  currency: string;
  sequenceNumber: number;
  isInitial: boolean;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITenancyPeriodRepository {
  create(
    period: Omit<TenancyPeriod, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod>;

  update(
    id: number,
    data: Partial<TenancyPeriod>,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod>;

  findById(id: number, tx?: Prisma.TransactionClient): Promise<TenancyPeriod | null>;

  findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<TenancyPeriod | null>;

  findByUserPropertyId(
    userPropertyId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod[]>;

  findInitialPeriod(
    userPropertyId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod | null>;

  findByDates(
    userPropertyId: number,
    startDate: Date,
    endDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod | null>;

  ensurePeriod(
    data: Omit<TenancyPeriod, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<TenancyPeriod>;
}

export const TENANCY_PERIOD_REPOSITORY = Symbol('TENANCY_PERIOD_REPOSITORY');
