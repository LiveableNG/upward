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

    // If unit is synced, update the upward_user_property record too
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

      } catch (error) {
        console.error(`Failed to sync unit update for ${uuid}:`, error);
      }
    }

    return updatedUnit;
  }
}
