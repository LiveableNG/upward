import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY, IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { RentalPeriodService } from '../../services/rental-period.service';

@Injectable()
export class AddUnitPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly rentalPeriodService: RentalPeriodService,
  ) { }

  async execute(pmId: number, unitUuid: string, data: any, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const unit = await this.unitRepository.findByUuid(unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(ownerPmId, unit.propertyId, actor);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this unit');
    }


    const paymentData: any = {
      amount: data.amount,
      paymentDate: new Date(data.paymentDate),
      method: data.method || 'Bank Transfer',
      status: data.status || 'SUCCESS',
      notes: data.notes || '',
    };

    let effectivePeriodStart = this.rentalPeriodService.parseCalendarDate(unit.rentStartDate);
    let effectivePeriodEnd = this.rentalPeriodService.parseCalendarDate(unit.rentDueDate);
    let effectiveRentAmountAtPayment = data.rentAmount !== undefined ? data.rentAmount : unit.rentAmount;

    let shouldIncrementUnitDates = false;
    let newUnitStart: Date | null = null;
    let newUnitEnd: Date | null = null;

    if (data.paymentType === 'CURRENT' && effectivePeriodStart && effectivePeriodEnd && unit.rentAmount) {
      const allPayments = await this.unitRepository.getRentPayments(unitUuid);

      const samePeriodPayments = allPayments.filter(p => {
        if (p.tenantId !== unit.tenantId || !p.periodStart) return false;
        const pStart = this.rentalPeriodService.parseCalendarDate(p.periodStart);
        return pStart && pStart.getTime() === effectivePeriodStart!.getTime();
      });

      const currentPeriodDueAmount = samePeriodPayments[0]?.rentAmountAtPayment ?? unit.rentAmount;
      const totalPaidForPeriod = samePeriodPayments.reduce((sum, p) => sum + p.amount, 0);

      // If the current period is ALREADY fully paid off, this payment belongs to the UPCOMING cycle
      if (totalPaidForPeriod >= currentPeriodDueAmount) {
        let years = (unit as any).leaseYears;
        if (!years || years <= 0) {
          for (const p of allPayments) {
            if (p.periodStart && p.periodEnd) {
              const pS = this.rentalPeriodService.parseCalendarDate(p.periodStart);
              const pE = this.rentalPeriodService.parseCalendarDate(p.periodEnd);
              if (pS && pE) {
                const diffTime = pE.getTime() - pS.getTime();
                const diffYears = Math.round(diffTime / (1000 * 60 * 60 * 24 * 365.25));
                if (diffYears >= 1) {
                  years = diffYears;
                  break;
                }
              }
            }
          }
        }

        const nextPeriod = this.rentalPeriodService.calculateNextPeriod(
          effectivePeriodStart,
          effectivePeriodEnd,
          unit.rentType,
          years,
        );

        newUnitStart = nextPeriod.nextStart;
        newUnitEnd = nextPeriod.nextEnd;

        effectivePeriodStart = newUnitStart;
        effectivePeriodEnd = newUnitEnd;

        const upcomingPeriodPayments = allPayments.filter(p => {
          if (p.tenantId !== unit.tenantId || !p.periodStart) return false;
          const pStart = this.rentalPeriodService.parseCalendarDate(p.periodStart);
          return pStart && pStart.getTime() === newUnitStart!.getTime();
        });
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
      paymentData.periodStart = this.rentalPeriodService.parseCalendarDate(data.periodStart);
      paymentData.periodEnd = this.rentalPeriodService.parseCalendarDate(data.periodEnd);

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

    // Synchronize PM unit and linked User Property state
    await this.rentalPeriodService.syncUnitPropertyState(unit.id);

    if (payment) {
      try {
        await this.activityLog.log({
          pmId: ownerPmId,
          ownerPmId,
          employeeId: actor?.employeeId,
          action: ActivityAction.ACCEPT_PAYMENT,
          entityType: 'PAYMENT',
          entityId: (payment as any)?.id?.toString(),
          description: `Recorded rent payment of ${data.amount} for unit ${unit.unitName || ''}`,
          metadata: {
            unitUuid,
            unitName: unit.unitName,
            amount: data.amount,
            paymentDate: paymentData.paymentDate,
            status: paymentData.status,
            method: paymentData.method,
            notes: paymentData.notes,
          },
        });
      } catch (logErr) {
        console.error('Failed to log payment activity:', logErr);
      }
    }

    return payment;
  }
}
