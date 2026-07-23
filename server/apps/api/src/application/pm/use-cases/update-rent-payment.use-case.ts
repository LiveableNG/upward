import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';

@Injectable()
export class UpdateRentPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmId: number, paymentUuid: string, data: any) {
    // 1. Find the payment and verify ownership
    const payment = await this.prisma.upward_pm_rent_payment.findUnique({
      where: { uuid: paymentUuid },
      include: { unit: { include: { property: true } } }
    });

    if (!payment || payment.unit.property.pmId !== pmId) {
      throw new NotFoundException('Rent record not found');
    }

    if (payment.method?.toUpperCase() === 'PAYSTACK') {
      throw new BadRequestException('Payments recorded automatically via the Upward Pay app cannot be edited.');
    }

    // 2. Update the PM record
    const updatedPayment = await this.unitRepository.updateRentPayment(paymentUuid, data);

    // Recalculate unit's active occupancy period.
    const unitUuid = payment.unit.uuid;
    const unit = payment.unit;
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
    }

    // Log Activity
    await this.activityLog.log({
        pmId,
        ownerPmId: payment.unit.property.pmId,
        action: ActivityAction.UPDATE_RENT,
        entityType: 'PAYMENT',
        entityId: paymentUuid,
        description: `Updated rent payment for ${payment.unit.unitName} (${payment.unit.property.name})`,
        metadata: {
            before: { amount: payment.amount, date: payment.paymentDate },
            after: data
        }
    });

    // 3. If unit is synced, try to update the corresponding rent cycle in Upward Core
    if (payment.unit.isSynced && payment.unit.userPropertyUuid) {
      const userProperty = await this.prisma.upward_user_property.findUnique({
        where: { uuid: payment.unit.userPropertyUuid }
      });

      if (userProperty) {
        // Try to find the matching rent cycle
        // We match by the old values to find the right record
        const matchingCycle = await this.prisma.upward_rent_cycle.findFirst({
          where: {
            userPropertyId: userProperty.id,
            paidAt: payment.paymentDate,
            amountPaid: payment.amount,
          }
        });

        if (matchingCycle) {
          await this.prisma.upward_rent_cycle.update({
            where: { id: matchingCycle.id },
            data: {
              amountPaid: data.amount !== undefined ? data.amount : undefined,
              amountOwed: data.amount !== undefined ? data.amount : undefined, // Keep in sync for history
              paidAt: data.paymentDate ? new Date(data.paymentDate) : undefined,
              dueDate: data.periodEnd ? new Date(data.periodEnd) : (data.paymentDate ? new Date(data.paymentDate) : undefined),
              description: data.notes !== undefined ? data.notes : undefined,
            }
          });
        }
      }
    }

    return updatedPayment;
  }
}
