import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';

@Injectable()
export class DeleteRentPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmId: number, paymentUuid: string) {
    // 1. Find the payment and verify ownership
    const payment = await this.prisma.upward_pm_rent_payment.findUnique({
      where: { uuid: paymentUuid },
      include: { unit: { include: { property: true } } }
    });

    if (!payment || payment.unit.property.pmId !== pmId) {
      throw new NotFoundException('Rent record not found');
    }

    if (payment.method?.toUpperCase() === 'PAYSTACK') {
      throw new BadRequestException('Payments recorded automatically via the Upward Pay app cannot be deleted.');
    }

    const unitUuid = payment.unit.uuid;
    const unit = payment.unit;

    // 2. Delete PM payment record directly from database
    await this.unitRepository.deleteRentPayment(paymentUuid);

    // 3. Recalculate unit's active occupancy period based on remaining payments
    const allPaymentsAfter = await this.unitRepository.getRentPayments(unitUuid);
    const tenantPayments = allPaymentsAfter.filter(p => p.tenantId === unit.tenantId && p.periodStart);

    const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number }>();
    for (const p of tenantPayments) {
      const key = new Date(p.periodStart!).toISOString().split('T')[0]!;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          periodStart: new Date(p.periodStart!),
          periodEnd: p.periodEnd ? new Date(p.periodEnd) : new Date(p.periodStart!),
          total: 0
        });
      }
      periodMap.get(key)!.total += p.amount;
    }

    const sortedPeriods = Array.from(periodMap.values()).sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
    );

    const fullyPaidPeriods = sortedPeriods.filter(p => p.total >= (unit.rentAmount || 0));

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
    } else if (sortedPeriods.length > 0) {
      const incompletePeriod = sortedPeriods[0]!;
      await this.unitRepository.update(unitUuid, {
        rentStartDate: incompletePeriod.periodStart,
        rentDueDate: incompletePeriod.periodEnd
      });

      if (unit.isSynced && unit.userPropertyUuid) {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: unit.userPropertyUuid },
          data: {
            rentStartDate: incompletePeriod.periodStart,
            rentEndDate: incompletePeriod.periodEnd
          }
        });
      }
    }

    // Log Activity
    await this.activityLog.log({
      pmId,
      ownerPmId: payment.unit.property.pmId,
      action: ActivityAction.DELETE_RENT,
      entityType: 'PAYMENT',
      entityId: paymentUuid,
      description: `Deleted rent payment record of ${payment.amount} for ${payment.unit.unitName} (${payment.unit.property.name})`,
      metadata: {
        amount: payment.amount,
        paymentDate: payment.paymentDate
      }
    });

    // 4. If unit is synced, clean up matching rent cycle record in Upward Core
    if (payment.unit.isSynced && payment.unit.userPropertyUuid) {
      const userProperty = await this.prisma.upward_user_property.findUnique({
        where: { uuid: payment.unit.userPropertyUuid }
      });

      if (userProperty) {
        const matchingCycle = await this.prisma.upward_rent_cycle.findFirst({
          where: {
            userPropertyId: userProperty.id,
            paidAt: payment.paymentDate,
            amountPaid: payment.amount,
          }
        });

        if (matchingCycle) {
          await this.prisma.upward_rent_cycle.delete({
            where: { id: matchingCycle.id }
          }).catch(() => null);
        }
      }
    }

    return { success: true, message: 'Rent payment record deleted' };
  }
}
