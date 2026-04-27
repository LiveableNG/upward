import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IPropertyRepository, PropertyEntity } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class PrismaPmPropertyRepository implements IPropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<PropertyEntity, 'id' | 'uuid'>): Promise<PropertyEntity> {
    return this.prisma.upward_pm_property.create({
      data: {
        pmId: data.pmId,
        name: data.name,
        address: data.address,
        totalUnits: data.totalUnits,
        propertyType: data.propertyType,
        imageUrl: data.imageUrl,
        country: data.country,
        state: data.state,
        area: data.area,
      },
    });
  }

  async findByPmId(pmId: number): Promise<PropertyEntity[]> {
    return this.prisma.upward_pm_property.findMany({
      where: { pmId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number): Promise<PropertyEntity | null> {
    return this.prisma.upward_pm_property.findUnique({
      where: { id },
    });
  }

  async findByUuid(uuid: string): Promise<PropertyEntity | null> {
    return this.prisma.upward_pm_property.findUnique({
      where: { uuid },
    });
  }

  async update(uuid: string, data: Partial<Omit<PropertyEntity, 'id' | 'uuid' | 'pmId'>>): Promise<PropertyEntity> {
    return this.prisma.upward_pm_property.update({
      where: { uuid },
      data,
    });
  }

  async delete(uuid: string): Promise<boolean> {
    await this.prisma.upward_pm_property.delete({
      where: { uuid },
    });
    return true;
  }
}
