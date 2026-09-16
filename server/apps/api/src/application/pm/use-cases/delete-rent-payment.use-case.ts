import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { RentalPeriodService } from '../../services/rental-period.service';

@Injectable()
export class DeleteRentPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly rentalPeriodService: RentalPeriodService,
  ) {}

  async execute(pmId: number, paymentUuid: string, actor?: any) {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    // 1. Find the payment and verify ownership
    const payment = await this.prisma.upward_pm_rent_payment.findUnique({
      where: { uuid: paymentUuid },
      include: { unit: { include: { property: true } } }
    });

    if (!payment || payment.unit.property.pmId !== ownerPmId) {
      throw new NotFoundException('Rent record not found');
    }

    if (actor?.isEmployee && actor.accessLevel !== 'ALL') {
      const assigned = await (this.prisma as any).upward_pm_employee_property.findFirst({
        where: {
          employeeId: actor.employeeId,
          ownerPmId: actor.ownerPmId,
          propertyId: payment.unit.property.id,
        }
      });
      if (!assigned) {
        throw new NotFoundException('Rent record not found');
      }
    }

    if (payment.method?.toUpperCase() === 'PAYSTACK') {
      throw new BadRequestException('Payments recorded automatically via the Upward Pay app cannot be deleted.');
    }


    const unitUuid = payment.unit.uuid;
    const unit = payment.unit;

    // 2. Delete PM payment record directly from database
    await this.unitRepository.deleteRentPayment(paymentUuid);

    // 3. Synchronize PM unit and linked User Property state
    await this.rentalPeriodService.syncUnitPropertyState(unit.id);

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
