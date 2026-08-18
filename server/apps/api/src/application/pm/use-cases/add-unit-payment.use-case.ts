import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class AddUnitPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
  ) { }

  async execute(pmId: number, unitUuid: string, data: any) {
    const unit = await this.unitRepository.findByUuid(unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const paymentData: any = {
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      method: data.method || 'Bank Transfer',
      status: data.status || 'SUCCESS',
      notes: data.notes || '',
    };

    let effectivePeriodStart = unit.rentStartDate ? new Date(unit.rentStartDate) : null;
    let effectivePeriodEnd = unit.rentDueDate ? new Date(unit.rentDueDate) : null;
    let effectiveRentAmountAtPayment = data.rentAmount !== undefined ? data.rentAmount : unit.rentAmount;

    let shouldIncrementUnitDates = false;
    let newUnitStart: Date | null = null;
    let newUnitEnd: Date | null = null;

    if (data.paymentType === 'CURRENT' && unit.rentStartDate && unit.rentDueDate && unit.rentAmount) {
      const allPayments = await this.unitRepository.getRentPayments(unitUuid);

      const samePeriodPayments = allPayments.filter(p =>
        p.tenantId === unit.tenantId &&
        p.periodStart &&
        new Date(p.periodStart).getTime() === new Date(unit.rentStartDate as Date).getTime()
      );

      const currentPeriodDueAmount = samePeriodPayments[0]?.rentAmountAtPayment ?? unit.rentAmount;
      const totalPaidForPeriod = samePeriodPayments.reduce((sum, p) => sum + p.amount, 0);

      // If the current period is ALREADY fully paid off, this payment belongs to the UPCOMING cycle
      if (totalPaidForPeriod >= currentPeriodDueAmount) {
        newUnitStart = new Date(unit.rentDueDate);
        newUnitStart.setDate(newUnitStart.getDate() + 1);

        newUnitEnd = new Date(newUnitStart);
        if (unit.rentType === 'Monthly') {
          newUnitEnd.setMonth(newUnitEnd.getMonth() + 1);
        } else if (unit.rentType === 'Lease' || unit.rentType === 'LEASE') {
          let years = (unit as any).leaseYears;
          if (!years || years <= 0) {
            for (const p of allPayments) {
              if (p.periodStart && p.periodEnd) {
                const diffTime = new Date(p.periodEnd).getTime() - new Date(p.periodStart).getTime();
                const diffYears = Math.round(diffTime / (1000 * 60 * 60 * 24 * 365.25));
                if (diffYears >= 1) {
                  years = diffYears;
                  break;
                }
              }
            }
          }
          years = Math.max(1, years || 1);
          newUnitEnd.setFullYear(newUnitEnd.getFullYear() + years);
        } else {
          newUnitEnd.setFullYear(newUnitEnd.getFullYear() + 1);
        }
        newUnitEnd.setDate(newUnitEnd.getDate() - 1);


        effectivePeriodStart = newUnitStart;
        effectivePeriodEnd = newUnitEnd;

        const upcomingPeriodPayments = allPayments.filter(p =>
          p.tenantId === unit.tenantId &&
          p.periodStart &&
          new Date(p.periodStart).getTime() === newUnitStart!.getTime()
        );
        // Anchor to the upcoming period's own rate if it already has payments,
        // otherwise this payment establishes it at the unit's current live rent.
        const upcomingPeriodDueAmount = upcomingPeriodPayments[0]?.rentAmountAtPayment ?? unit.rentAmount;
        const upcomingPaidSoFar = upcomingPeriodPayments.reduce((sum, p) => sum + p.amount, 0);

        effectiveRentAmountAtPayment = upcomingPeriodDueAmount;

        if (upcomingPaidSoFar + data.amount >= upcomingPeriodDueAmount) {
          shouldIncrementUnitDates = true;
        }
      } else {
        effectiveRentAmountAtPayment = currentPeriodDueAmount;
      }
    }

    paymentData.rentAmountAtPayment = effectiveRentAmountAtPayment;

    if (data.paymentType === 'PAST') {
      paymentData.periodStart = data.periodStart ? new Date(data.periodStart) : null;
      paymentData.periodEnd = data.periodEnd ? new Date(data.periodEnd) : null;

      if (data.isForCurrentTenant) {
        paymentData.tenantId = unit.tenantId;
        paymentData.notes = 'Past Payment';
      } else {
        paymentData.notes = data.tenantName ? `Past Payment (Tenant: ${data.tenantName})` : 'Past Payment';
      }
    } else {
      paymentData.periodStart = effectivePeriodStart;
      paymentData.periodEnd = effectivePeriodEnd;
      paymentData.tenantId = unit.tenantId;
    }

    const payment = await this.unitRepository.addRentPayment(unitUuid, paymentData);

    const allPaymentsAfter = await this.unitRepository.getRentPayments(unitUuid);
    const tenantPayments = allPaymentsAfter.filter(p => p.tenantId === unit.tenantId && p.periodStart);

    const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number; amountDue: number }>();
    for (const p of tenantPayments) {
      const key = new Date(p.periodStart!).toISOString().split('T')[0]!;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          periodStart: new Date(p.periodStart!),
          periodEnd: p.periodEnd ? new Date(p.periodEnd) : new Date(p.periodStart!),
          total: 0,
          amountDue: p.rentAmountAtPayment
        });
      }
      periodMap.get(key)!.total += p.amount;
    }

    const sortedPeriods = Array.from(periodMap.values()).sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
    );

    const fullyPaidPeriods = sortedPeriods.filter(p => p.total >= p.amountDue);

    if (fullyPaidPeriods.length > 0) {
      const latestFullyPaid = fullyPaidPeriods[fullyPaidPeriods.length - 1]!;
      await this.unitRepository.update(unitUuid, {
        rentStartDate: latestFullyPaid.periodStart,
        rentDueDate: latestFullyPaid.periodEnd
      });

      if (unit.isSynced && unit.userPropertyUuid) {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: unit.userPropertyUuid },
          data: {
            rentStartDate: latestFullyPaid.periodStart,
            rentEndDate: latestFullyPaid.periodEnd
          }
        });
      }
    }

    if (unit.isSynced && unit.userPropertyUuid) {
      const userProperty = await this.prisma.upward_user_property.findUnique({
        where: { uuid: unit.userPropertyUuid }
      });

      if (userProperty) {
        await this.prisma.upward_rent_cycle.create({
          data: {
            userId: userProperty.userId,
            userPropertyId: userProperty.id,
            amountOwed: payment.amount,
            amountPaid: payment.amount,
            currency: unit.currency,
            dueDate: payment.periodEnd || payment.paymentDate,
            paidAt: payment.paymentDate,
            status: 'PAID',
            description: payment.notes || 'Manual rent record (PM Dashboard)',
            source: 'PM_SYNC',
          }
        });
      }
    }

    return payment;
  }
}
