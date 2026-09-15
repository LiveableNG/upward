import { Injectable, Logger } from '@nestjs/common';

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
        },
      });
    }

    // ── Update Payment Request dates if linked
    if (paymentRequestId && periodStart && periodEnd) {
      await txClient.upward_payment_request.update({
        where: { id: paymentRequestId },
        data: {
          rentStartDate: periodStart,
          rentEndDate: periodEnd,
          dueDate: periodEnd,
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
    };
  }
}
