import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';

export interface CalculatedPeriod {
  nextStart: Date;
  nextEnd: Date;
}

export interface InitialRentalState {
  isFirstRent: boolean;
  initialAmountPaid: number;
  amountPaid: number;
  amountRemaining: number;
  rentStartDate: Date;
  rentEndDate: Date;
}

export interface ProcessRentPaymentParams {
  userId: number;
  propertyId: number;
  rentPortion: number;
  paymentRequestId?: number;
  dueDate?: Date;
  rentEndDate?: Date;
  rentType?: string;
  currency?: string;
  description?: string;
  txClient: any;
}

export interface ProcessRentPaymentResult {
  periodStart: Date;
  periodEnd: Date;
  isFullySettled: boolean;
  isAdvancing: boolean;
  amountPaid: number;
  amountRemaining: number;
  tenancyPeriodId?: number;
}

export interface ResolvedTargetPeriod {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  isAdvance: boolean;
}

@Injectable()
export class RentalPeriodService {
  private readonly logger = new Logger(RentalPeriodService.name);

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Canonical UTC Midnight representation of a calendar date.
   * Strips all local timezone shifts to guarantee consistent calendar day boundaries.
   */
  parseCalendarDate(input: Date | string | null | undefined): Date | null {
    if (!input) return null;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      const datePart = trimmed.includes('T') ? trimmed.split('T')[0]! : trimmed;
      const [y, m, d] = datePart.split('-').map(Number);
      if (y && m && d) {
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
      }
      return null;
    }
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
  }

  calculatePeriodEnd(
    startDate: Date | string,
    rentType?: string | null,
    leaseYears?: number | null,
  ): Date {
    const start = this.parseCalendarDate(startDate) || this.parseCalendarDate(new Date())!;
    const normalizedRentType = (rentType || '').toUpperCase();

    let end: Date;
    if (normalizedRentType === 'MONTHLY') {
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate() - 1, 0, 0, 0, 0));
    } else {
      const years = Math.max(1, leaseYears || 1);
      end = new Date(Date.UTC(start.getUTCFullYear() + years, start.getUTCMonth(), start.getUTCDate() - 1, 0, 0, 0, 0));
    }

    if (start.getTime() >= end.getTime()) {
      throw new Error(`Invalid calculated period: start (${start.toISOString()}) must be before end (${end.toISOString()})`);
    }

    return end;
  }

  /**
   * Standardized UTC date arithmetic for advancing rental periods.
   */
  calculateNextPeriod(
    currentStart: Date | string,
    currentEnd: Date | string,
    rentType?: string | null,
    leaseYears?: number | null,
  ): CalculatedPeriod {
    const end = this.parseCalendarDate(currentEnd) || this.parseCalendarDate(currentStart) || new Date();
    const nextStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1, 0, 0, 0, 0));
    const nextEnd = this.calculatePeriodEnd(nextStart, rentType, leaseYears);

    return { nextStart, nextEnd };
  }

  /**
   * Authoritative target period resolution for upcoming payments or payment request generation.
   * Delegates the state-machine check directly to RentalPeriodService.
   */
  resolveTargetRentalPeriod(
    prop: {
      rentStartDate?: Date | string | null;
      rentEndDate?: Date | string | null;
      rentType?: string | null;
      leaseYears?: number | null;
      amountRemaining?: number | null;
      isFirstRent?: boolean | null;
    },
    explicitPrDates?: {
      rentStartDate?: Date | string | null;
      rentEndDate?: Date | string | null;
    },
  ): ResolvedTargetPeriod {
    const currentStart = this.parseCalendarDate(prop.rentStartDate) || this.parseCalendarDate(new Date())!;
    const currentEnd = this.parseCalendarDate(prop.rentEndDate) || this.calculatePeriodEnd(currentStart, prop.rentType, prop.leaseYears);
    
    const isCurrentPeriodSettled = (prop.amountRemaining === 0) && (prop.isFirstRent === false);

    if (isCurrentPeriodSettled) {
      const calculated = this.calculateNextPeriod(currentStart, currentEnd, prop.rentType, prop.leaseYears);
      const prStart = this.parseCalendarDate(explicitPrDates?.rentStartDate);
      const prEnd = this.parseCalendarDate(explicitPrDates?.rentEndDate);

      const periodStart = (prStart && prStart.getTime() > currentStart.getTime()) ? prStart : calculated.nextStart;
      const periodEnd = (prEnd && prEnd.getTime() > periodStart.getTime()) ? prEnd : calculated.nextEnd;

      return {
        periodStart,
        periodEnd,
        dueDate: periodEnd,
        isAdvance: true,
      };
    }

    // Active cycle is incomplete (isFirstRent=true or balance remaining). Belongs to current period.
    return {
      periodStart: currentStart,
      periodEnd: currentEnd,
      dueDate: currentEnd,
      isAdvance: false,
    };
  }

  /**
   * Initializes rental state deterministically for any onboarding or creation path.
   */
  initializeRentalState(params: {
    rentAmount: number;
    rentStartDate?: Date | string | null;
    rentEndDate?: Date | string | null;
    rentType?: string | null;
    initialAmountPaid?: number | null;
    isFirstRent?: boolean | null;
    leaseYears?: number | null;
    tenancyStatus?: 'NEW_CYCLE' | 'PAYING_BALANCE' | 'ALREADY_PAID' | string | null;
  }): InitialRentalState {
    const rentAmount = Math.max(0, Number(params.rentAmount) || 0);
    const initialAmountPaid = Math.max(0, Number(params.initialAmountPaid) || 0);

    let isFirstRent = params.isFirstRent !== undefined && params.isFirstRent !== null
      ? params.isFirstRent
      : true;

    if (params.tenancyStatus === 'ALREADY_PAID') {
      isFirstRent = false;
    } else if (params.tenancyStatus === 'NEW_CYCLE') {
      isFirstRent = true;
    }

    if (initialAmountPaid >= rentAmount && rentAmount > 0) {
      isFirstRent = false;
    }

    const amountPaid = isFirstRent ? Math.min(rentAmount, initialAmountPaid) : rentAmount;
    const amountRemaining = isFirstRent ? Math.max(0, rentAmount - initialAmountPaid) : 0;

    const rentStartDate = this.parseCalendarDate(params.rentStartDate) || this.parseCalendarDate(new Date())!;

    let rentEndDate: Date;
    if (params.rentEndDate) {
      rentEndDate = this.parseCalendarDate(params.rentEndDate)!;
    } else {
      rentEndDate = this.calculatePeriodEnd(
        rentStartDate,
        params.rentType,
        params.leaseYears,
      );
    }

    if (rentStartDate.getTime() >= rentEndDate.getTime()) {
      throw new Error(`Invariant Violation: rentStartDate (${rentStartDate.toISOString()}) must be before rentEndDate (${rentEndDate.toISOString()})`);
    }

    return {
      isFirstRent,
      initialAmountPaid,
      amountPaid,
      amountRemaining,
      rentStartDate,
      rentEndDate,
    };
  }


  async processRentPayment(params: ProcessRentPaymentParams): Promise<ProcessRentPaymentResult> {
    const {
      propertyId,
      rentPortion,
      paymentRequestId,
      description,
      txClient,
    } = params;

    const prop = await txClient.upward_user_property.findUnique({
      where: { id: propertyId },
    });

    if (!prop) {
      throw new Error(`Property ${propertyId} not found during rent payment processing`);
    }

    const currentStart = this.parseCalendarDate(prop.rentStartDate) || this.parseCalendarDate(new Date())!;
    const currentEnd = this.parseCalendarDate(prop.rentEndDate) || this.calculatePeriodEnd(currentStart, prop.rentType, prop.leaseYears);
    const rentAmount = prop.rentAmount || rentPortion;
    const effectiveRentType = params.rentType || prop.rentType || 'Annually';
    const leaseYears = (prop as any).leaseYears || 1;

    let prStartDate: Date | null = null;
    let prEndDate: Date | null = null;
    if (paymentRequestId) {
      const pr = await txClient.upward_payment_request.findUnique({
        where: { id: paymentRequestId },
      });
      if (pr?.rentStartDate) prStartDate = this.parseCalendarDate(pr.rentStartDate);
      if (pr?.rentEndDate) prEndDate = this.parseCalendarDate(pr.rentEndDate);
    }

    // Explicit state machine check:
    // If amountRemaining > 0 || isFirstRent -> CURRENT period
    // If amountRemaining === 0 && !isFirstRent -> Current period is settled; advance to NEXT period
    const isCurrentPeriodSettled = (prop.amountRemaining === 0) && (prop.isFirstRent === false);

    let periodStart: Date;
    let periodEnd: Date;
    let isAdvancing = false;
    let newAmountPaid: number;
    let newAmountRemaining: number;
    let newIsFirstRent: boolean;

    if (isCurrentPeriodSettled) {
      // ── Current period is completely settled. This payment starts the NEXT period.
      const calculated = this.calculateNextPeriod(currentStart, currentEnd, effectiveRentType, leaseYears);
      periodStart = (prStartDate && prStartDate.getTime() > currentStart.getTime()) ? prStartDate : calculated.nextStart;
      periodEnd = (prEndDate && prEndDate.getTime() > periodStart.getTime()) ? prEndDate : calculated.nextEnd;
      isAdvancing = true;

      newAmountRemaining = Math.max(0, rentAmount - rentPortion);
      newAmountPaid = rentAmount - newAmountRemaining; // Invariant: amountPaid + amountRemaining === rentAmount
      newIsFirstRent = false;

      await txClient.upward_user_property.update({
        where: { id: prop.id },
        data: {
          rentStartDate: periodStart,
          rentEndDate: periodEnd,
          amountPaid: newAmountPaid,
          amountRemaining: newAmountRemaining,
          isFirstRent: false,
          isPastTenancy: false,
        },
      });

      this.logger.log(
        `Advanced property ${prop.id} to new cycle: ${periodStart.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}. Paid: ${newAmountPaid}, Remaining: ${newAmountRemaining}`,
      );
    } else {
      // ── Current period is incomplete (isFirstRent=true or balance remaining).
      // Payment applies to CURRENT period. Dates do NOT advance.
      periodStart = currentStart;
      periodEnd = currentEnd;
      isAdvancing = false;

      const totalPaid = (prop.amountPaid || 0) + rentPortion;
      newAmountRemaining = Math.max(0, rentAmount - totalPaid);
      newAmountPaid = rentAmount - newAmountRemaining; // Invariant: amountPaid + amountRemaining === rentAmount
      const isSettled = newAmountRemaining === 0;
      newIsFirstRent = isSettled ? false : (prop.isFirstRent ?? true);

      await txClient.upward_user_property.update({
        where: { id: prop.id },
        data: {
          amountPaid: newAmountPaid,
          amountRemaining: newAmountRemaining,
          isFirstRent: newIsFirstRent,
          isPastTenancy: false,
        },
      });

      this.logger.log(
        `Applied payment to current cycle for property ${prop.id}: ${periodStart.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}. isFirstRent=${newIsFirstRent}, Paid: ${newAmountPaid}, Remaining: ${newAmountRemaining}`,
      );
    }

    // ── Ensure Tenancy Period Record Exists
    let tenancyPeriodRecord: any = null;
    try {
      tenancyPeriodRecord = await this.ensureTenancyPeriod({
        userPropertyId: prop.id,
        startDate: periodStart,
        endDate: periodEnd,
        rentAmount,
        currency: params.currency || (prop as any).currency || 'NGN',
        isInitial: !isAdvancing && (prop.isFirstRent === true || (prop.initialAmountPaid || 0) > 0),
        status: newAmountRemaining === 0 ? 'SETTLED' : 'ACTIVE',
        txClient,
      });
    } catch (tpErr: any) {
      this.logger.warn(`Failed to record tenancy period for property ${prop.id}: ${tpErr?.message}`);
    }

    const tenancyPeriodId = tenancyPeriodRecord?.id;

    // ── Create Platform Rent Payment Ledger Record (for platform properties)
    if (rentPortion > 0 && !prop.pmUnitId) {
      await txClient.upward_platform_rent_payment.create({
        data: {
          userPropertyId: prop.id,
          amount: rentPortion,
          rentAmountAtPayment: rentAmount,
          paymentDate: new Date(),
          method: 'PAYSTACK',
          status: 'SUCCESS',
          notes: description || (prop.uuid ? `Rent Payment for property ${prop.uuid.slice(-8)}` : `Rent Payment for property ${prop.id}`),
          periodStart,
          periodEnd,
          tenancyPeriodId,
        },
      });
    }

    // ── Update Payment Request dates & tenancyPeriodId if linked
    if (paymentRequestId && periodStart && periodEnd) {
      await txClient.upward_payment_request.update({
        where: { id: paymentRequestId },
        data: {
          rentStartDate: periodStart,
          rentEndDate: periodEnd,
          dueDate: periodEnd,
          tenancyPeriodId,
        },
      });
    }

    return {
      periodStart,
      periodEnd,
      isFullySettled: newAmountRemaining === 0,
      isAdvancing,
      amountPaid: newAmountPaid,
      amountRemaining: newAmountRemaining,
      tenancyPeriodId,
    };
  }

  async ensureTenancyPeriod(params: {
    userPropertyId: number;
    startDate: Date | string;
    endDate: Date | string;
    rentAmount?: number | null;
    currency?: string;
    isInitial?: boolean;
    status?: string;
    sequenceNumber?: number;
    txClient?: any;
  }): Promise<any> {
    const prisma = params.txClient || this.prisma;
    if (!prisma || !prisma.upward_tenancy_period) return null;

    const start = this.parseCalendarDate(params.startDate);
    const end = this.parseCalendarDate(params.endDate);
    if (!start || !end) return null;

    const existing = await prisma.upward_tenancy_period.findFirst({
      where: {
        userPropertyId: params.userPropertyId,
        startDate: start,
        endDate: end,
      },
    });

    if (existing) {
      if (params.status && existing.status !== params.status && params.status === 'SETTLED') {
        return await prisma.upward_tenancy_period.update({
          where: { id: existing.id },
          data: { status: params.status },
        });
      }
      return existing;
    }

    let sequenceNumber = params.sequenceNumber;
    if (!sequenceNumber) {
      const existingPeriods = await prisma.upward_tenancy_period.findMany({
        where: { userPropertyId: params.userPropertyId },
        orderBy: { startDate: 'asc' },
      });
      sequenceNumber = existingPeriods.length + 1;
    }

    return await prisma.upward_tenancy_period.create({
      data: {
        userPropertyId: params.userPropertyId,
        startDate: start,
        endDate: end,
        rentAmount: params.rentAmount,
        currency: params.currency || 'NGN',
        sequenceNumber,
        isInitial: params.isInitial ?? (sequenceNumber === 1),
        status: params.status || 'ACTIVE',
      },
    });
  }

  async ensureInitialTenancyPeriod(params: {
    userPropertyId: number;
    startDate: Date | string;
    endDate: Date | string;
    rentAmount?: number | null;
    currency?: string;
    txClient?: any;
  }): Promise<any> {
    return this.ensureTenancyPeriod({
      userPropertyId: params.userPropertyId,
      startDate: params.startDate,
      endDate: params.endDate,
      rentAmount: params.rentAmount,
      currency: params.currency,
      isInitial: true,
      sequenceNumber: 1,
      status: 'ACTIVE',
      txClient: params.txClient,
    });
  }

  async getTenancyHistory(userPropertyId: number, txClient?: any): Promise<any[]> {
    const prisma = txClient || this.prisma;
    if (!prisma || !prisma.upward_tenancy_period) return [];
    return await prisma.upward_tenancy_period.findMany({
      where: { userPropertyId },
      orderBy: { startDate: 'asc' },
    });
  }

  async getTenancyDuration(userPropertyId: number, txClient?: any): Promise<{
    months: number;
    years: number;
    startDate: Date | null;
    endDate: Date | null;
  }> {
    const history = await this.getTenancyHistory(userPropertyId, txClient);
    if (history.length === 0) {
      return { months: 0, years: 0, startDate: null, endDate: null };
    }
    const initialStart = history[0]!.startDate;
    const latestEnd = history[history.length - 1]!.endDate;
    const diffTime = latestEnd.getTime() - initialStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30.4375);
    const years = parseFloat((diffDays / 365.25).toFixed(1));
    return { months, years, startDate: initialStart, endDate: latestEnd };
  }

  async syncUnitPropertyState(unitId: number, txClient?: any): Promise<void> {
    const prisma = txClient || this.prisma;
    if (!prisma) {
      this.logger.warn(`No PrismaService available to sync unit property state for unitId=${unitId}`);
      return;
    }

    const unit = await prisma.upward_pm_unit.findUnique({
      where: { id: unitId },
      include: { property: true },
    });
    if (!unit) return;

    let userProperty = null;
    if (unit.userPropertyUuid) {
      userProperty = await prisma.upward_user_property.findUnique({
        where: { uuid: unit.userPropertyUuid },
      });
    }
    if (!userProperty) {
      userProperty = await prisma.upward_user_property.findFirst({
        where: { pmUnitId: unit.id },
      });
    }

    const payments = await prisma.upward_pm_rent_payment.findMany({
      where: {
        unitId: unit.id,
        tenantId: unit.tenantId || undefined,
        status: 'SUCCESS',
      },
    });

    const periodMap = new Map<
      number,
      {
        periodStart: Date;
        periodEnd: Date;
        totalPaid: number;
        amountDue: number;
      }
    >();

    for (const p of payments) {
      const start = this.parseCalendarDate(p.periodStart);
      if (!start) continue;
      const end =
        this.parseCalendarDate(p.periodEnd) ||
        this.calculatePeriodEnd(start, unit.rentType, (unit as any).leaseYears);
      const key = start.getTime();
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          periodStart: start,
          periodEnd: end,
          totalPaid: 0,
          amountDue: p.rentAmountAtPayment || unit.rentAmount || 0,
        });
      }
      periodMap.get(key)!.totalPaid += (p.amount || 0);
    }

    const sortedPeriods = Array.from(periodMap.values()).sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
    );

    // Ensure all discovered unit periods are represented in upward_tenancy_period
    if (userProperty && sortedPeriods.length > 0) {
      for (let i = 0; i < sortedPeriods.length; i++) {
        const p = sortedPeriods[i]!;
        try {
          await this.ensureTenancyPeriod({
            userPropertyId: userProperty.id,
            startDate: p.periodStart,
            endDate: p.periodEnd,
            rentAmount: p.amountDue,
            sequenceNumber: i + 1,
            isInitial: i === 0,
            status: p.totalPaid >= p.amountDue ? 'SETTLED' : 'ACTIVE',
            txClient: prisma,
          });
        } catch (e: any) {
          this.logger.warn(`Failed to ensure tenancy period during unit sync: ${e?.message}`);
        }
      }
    }

    let activeStart: Date;
    let activeEnd: Date;
    let amountPaid: number;
    let amountRemaining: number;
    let isFirstRent: boolean;

    if (sortedPeriods.length === 0) {
      activeStart =
        this.parseCalendarDate(unit.rentStartDate) ||
        this.parseCalendarDate(new Date())!;
      activeEnd =
        this.parseCalendarDate(unit.rentDueDate) ||
        this.calculatePeriodEnd(activeStart, unit.rentType, (unit as any).leaseYears);
      amountPaid = 0;
      amountRemaining = unit.rentAmount || 0;
      isFirstRent = userProperty?.isFirstRent ?? true;
    } else {
      const earliestIncomplete = sortedPeriods.find(
        (p) => p.totalPaid < p.amountDue,
      );

      if (earliestIncomplete) {
        activeStart = earliestIncomplete.periodStart;
        activeEnd = earliestIncomplete.periodEnd;
        amountPaid = Math.min(earliestIncomplete.amountDue, earliestIncomplete.totalPaid);
        amountRemaining = Math.max(
          0,
          earliestIncomplete.amountDue - earliestIncomplete.totalPaid,
        );
        const isEarliestPeriod =
          earliestIncomplete.periodStart.getTime() ===
          sortedPeriods[0]!.periodStart.getTime();
        isFirstRent = isEarliestPeriod ? (userProperty?.isFirstRent ?? true) : false;
      } else {
        const latestFullyPaid = sortedPeriods[sortedPeriods.length - 1]!;
        activeStart = latestFullyPaid.periodStart;
        activeEnd = latestFullyPaid.periodEnd;
        amountPaid = latestFullyPaid.amountDue;
        amountRemaining = 0;
        isFirstRent = false;
      }
    }

    await prisma.upward_pm_unit.update({
      where: { id: unit.id },
      data: {
        rentStartDate: activeStart,
        rentDueDate: activeEnd,
      },
    });

    if (userProperty) {
      await prisma.upward_user_property.update({
        where: { id: userProperty.id },
        data: {
          rentStartDate: activeStart,
          rentEndDate: activeEnd,
          amountPaid,
          amountRemaining,
          isFirstRent,
          isPastTenancy: false,
        },
      });
      this.logger.log(
        `Synced user property ${userProperty.id} (unit ${unit.id}): start=${activeStart.toISOString().split('T')[0]}, end=${activeEnd.toISOString().split('T')[0]}, paid=${amountPaid}, remaining=${amountRemaining}, isFirstRent=${isFirstRent}`,
      );
    }
  }
}
