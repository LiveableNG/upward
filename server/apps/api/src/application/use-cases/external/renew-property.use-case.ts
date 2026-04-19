import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository';

@Injectable()
export class RenewPropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(propertyUuid: string): Promise<any> {
    const property = await this.propertyRepository.findByUuid(propertyUuid);
    if (!property) {
      throw new NotFoundException(`Property with UUID ${propertyUuid} not found`);
    }

    let newEndDate = new Date();
    if (property.rentEndDate) {
      newEndDate = new Date(property.rentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    }

    const updated = await this.prisma.upward_user_property.update({
      where: { id: property.id },
      data: {
        isPastTenancy: false,
        rentEndDate: newEndDate,
      }
    });

    return {
      success: true,
      newEndDate: updated.rentEndDate,
      isPastTenancy: updated.isPastTenancy,
    };
  }
}
