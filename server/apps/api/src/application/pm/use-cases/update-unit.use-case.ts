import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class UpdateUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string, data: any) {
    const units = await this.unitRepository.findByPmId(pmId);
    const unit = units.find(u => u.uuid === uuid);
    
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const updatedUnit = await this.unitRepository.update(uuid, data);

    // If unit has a tenant assigned and rent dates or amount were updated, update active rent payment record
    if (updatedUnit.tenantId && (data.rentStartDate || data.rentDueDate || data.rentAmount)) {
      try {
        const activePayments = await this.prisma.upward_pm_rent_payment.findMany({
          where: {
            unitId: updatedUnit.id,
            tenantId: updatedUnit.tenantId,
            status: 'SUCCESS',
          },
          orderBy: { paymentDate: 'desc' },
          take: 1,
        });

        if (activePayments.length > 0 && activePayments[0]) {
          await this.prisma.upward_pm_rent_payment.update({
            where: { id: activePayments[0].id },
            data: {
              periodStart: updatedUnit.rentStartDate || undefined,
              periodEnd: updatedUnit.rentDueDate || undefined,
              amount: data.rentAmount ? Number(data.rentAmount) : undefined,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to update rent payments for unit ${uuid}:`, error);
      }
    }

    // If unit is synced, update the upward_user_property and upward_rent_cycle records too
    if (updatedUnit.isSynced && updatedUnit.userPropertyUuid) {
      try {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: updatedUnit.userPropertyUuid },
          data: {
            rentAmount: updatedUnit.rentAmount,
            rentType: updatedUnit.rentType,
            currency: updatedUnit.currency,
            rentStartDate: updatedUnit.rentStartDate || undefined,
            rentEndDate: updatedUnit.rentDueDate || undefined,
            rentReminderEnabled: updatedUnit.rentReminderEnabled,
            rentReminderDaysBefore: updatedUnit.rentReminderDaysBefore,
          }
        });

        const userProp = await this.prisma.upward_user_property.findUnique({
          where: { uuid: updatedUnit.userPropertyUuid }
        });
        if (userProp) {
          const latestCycle = await this.prisma.upward_rent_cycle.findFirst({
            where: { userPropertyId: userProp.id },
            orderBy: { createdAt: 'desc' }
          });
          if (latestCycle) {
            await this.prisma.upward_rent_cycle.update({
              where: { id: latestCycle.id },
              data: {
                dueDate: updatedUnit.rentDueDate || undefined,
                amountOwed: updatedUnit.rentAmount,
                currency: updatedUnit.currency,
              }
            });
          }
        }

      } catch (error) {
        console.error(`Failed to sync unit update for ${uuid}:`, error);
      }
    }

    return updatedUnit;
  }
}
