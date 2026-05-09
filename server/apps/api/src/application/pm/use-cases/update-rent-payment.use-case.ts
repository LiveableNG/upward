import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class UpdateRentPaymentUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
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

    // 2. Update the PM record
    const updatedPayment = await this.unitRepository.updateRentPayment(paymentUuid, data);

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
