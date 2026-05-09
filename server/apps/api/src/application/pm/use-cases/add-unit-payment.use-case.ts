import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class AddUnitPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, unitUuid: string, data: any) {
    // Verify PM owns the unit
    const unit = await this.unitRepository.findByUuid(unitUuid);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // 1. Create the PM record
    const payment = await this.unitRepository.addRentPayment(unitUuid, {
      ...data,
      paymentDate: new Date(data.paymentDate),
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
    });

    // 2. Sync to Upward Core if the unit is already synced
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
