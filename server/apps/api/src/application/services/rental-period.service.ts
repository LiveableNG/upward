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

@Injectable()
export class RentalPeriodService {
  private readonly logger = new Logger(RentalPeriodService.name);

  /**
   * Standardized date arithmetic for advancing rental periods.
   */
  calculateNextPeriod(
    currentStart: Date,
    currentEnd: Date,
    rentType?: string | null,
    leaseYears?: number | null,
  ): CalculatedPeriod {
    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);
    nextStart.setHours(0, 0, 0, 0);

    const nextEnd = new Date(nextStart);
    const normalizedRentType = (rentType || '').toUpperCase();

    if (normalizedRentType === 'MONTHLY') {
      nextEnd.setMonth(nextEnd.getMonth() + 1);
    } else {
      const years = Math.max(1, leaseYears || 1);
      nextEnd.setFullYear(nextEnd.getFullYear() + years);
    }
    nextEnd.setDate(nextEnd.getDate() - 1);
    nextEnd.setHours(23, 59, 59, 999);

    return { nextStart, nextEnd };
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

    // If initial payment covers the full rent amount, mark as settled for initial onboarding
    if (initialAmountPaid >= rentAmount && rentAmount > 0) {
      isFirstRent = false;
    }

    const amountPaid = isFirstRent ? initialAmountPaid : rentAmount;
    const amountRemaining = isFirstRent ? Math.max(0, rentAmount - initialAmountPaid) : 0;

    const rentStartDate = params.rentStartDate
      ? new Date(params.rentStartDate)
      : new Date();
    rentStartDate.setHours(0, 0, 0, 0);

    let rentEndDate: Date;
    if (params.rentEndDate) {
      rentEndDate = new Date(params.rentEndDate);
    } else {
      rentEndDate = this.calculateNextPeriod(
        rentStartDate,
        rentStartDate,
        params.rentType,
        params.leaseYears,
      ).nextEnd;
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

  /**
   * Authoritative state-transition function for processing rent payments.
   * Resolves the exact rental period for the payment, applies balance updates,
   * advances the period only when required, and creates the ledger record.
   */
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

    const currentStart = prop.rentStartDate ? new Date(prop.rentStartDate) : new Date();
    const currentEnd = prop.rentEndDate ? new Date(prop.rentEndDate) : null;
    const rentAmount = prop.rentAmount || rentPortion;
    const effectiveRentType = params.rentType || prop.rentType || 'Annually';
    const leaseYears = (prop as any).leaseYears || 1;

    // Check if the current cycle on the property was already fully settled
    const isCurrentCycleSettled = prop.amountRemaining === 0 && prop.isFirstRent === false;

    let periodStart: Date;
    let periodEnd: Date;
    let isAdvancing = false;
    let newAmountPaid: number;
    let newAmountRemaining: number;
    let newIsFirstRent: boolean;

    if (isCurrentCycleSettled && currentEnd) {
      // ── CASE A: Active cycle is already fully paid. This payment starts the NEXT cycle.
      const calculated = this.calculateNextPeriod(currentStart, currentEnd, effectiveRentType, leaseYears);
      periodStart = calculated.nextStart;
      periodEnd = calculated.nextEnd;
      isAdvancing = true;

      newAmountPaid = rentPortion;
      newAmountRemaining = Math.max(0, rentAmount - rentPortion);
      const isSettled = newAmountRemaining === 0;
      newIsFirstRent = false;

      await txClient.upward_user_property.update({
        where: { id: prop.id },
        data: {
          rentStartDate: periodStart,
          rentEndDate: periodEnd,
          amountPaid: isSettled ? rentAmount : newAmountPaid,
          amountRemaining: newAmountRemaining,
          isFirstRent: false,
          isPastTenancy: false,
        },
      });

      this.logger.log(
        `Advanced property ${prop.id} to new cycle: ${periodStart.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}. Balance remaining: ${newAmountRemaining}`,
      );
    } else {
      // ── CASE B: Active cycle is incomplete (partially paid or isFirstRent=true).
      // Payment belongs to the CURRENT period. Do NOT advance dates.
      periodStart = currentStart;
      periodEnd = currentEnd || this.calculateNextPeriod(currentStart, currentStart, effectiveRentType, leaseYears).nextEnd;
      isAdvancing = false;

      const totalPaid = (prop.amountPaid || 0) + rentPortion;
      newAmountRemaining = Math.max(0, rentAmount - totalPaid);
      const isSettled = newAmountRemaining === 0;
      newAmountPaid = isSettled ? rentAmount : totalPaid;
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
        `Applied payment to current cycle for property ${prop.id}: ${periodStart.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}. isFirstRent=${newIsFirstRent}, remaining=${newAmountRemaining}`,
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
          notes: description || `Rent Payment for property ${prop.uuid.slice(-8)}`,
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
