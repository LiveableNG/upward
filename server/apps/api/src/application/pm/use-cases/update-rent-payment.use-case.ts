import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService, ActivityAction } from '../../../shared/application/activity-log.service';
import { RentalPeriodService } from '../../services/rental-period.service';

@Injectable()
export class UpdateRentPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly rentalPeriodService: RentalPeriodService,
  ) { }

  async execute(pmId: number, paymentUuid: string, data: any, actor?: any) {
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
      throw new BadRequestException('Payments recorded automatically via the Upward Pay app cannot be edited.');
    }


    // 2. Update the PM record
    const updatedPayment = await this.unitRepository.updateRentPayment(paymentUuid, data);

    // 3. Synchronize PM unit and linked User Property state
    await this.rentalPeriodService.syncUnitPropertyState(payment.unit.id);

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
    return updatedPayment;
  }
}
