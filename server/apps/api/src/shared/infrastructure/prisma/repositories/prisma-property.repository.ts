import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  Property,
  Location,
  PropertyRepository,
  LocationRepository,
} from '@domains/companies/property.repository'

@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Property | null> {
    const record = await this.prisma.upward_user_property.findUnique({
      where: { id },
    })
    return record as unknown as Property | null
  }

  async findByUuid(uuid: string): Promise<Property | null> {
    const record = await this.prisma.upward_user_property.findUnique({
      where: { uuid },
    })
    return record as unknown as Property | null
  }

  async findByUserId(userId: number): Promise<Property[]> {
    const records = await this.prisma.upward_user_property.findMany({
      where: { userId },
    })
    return records as unknown as Property[]
  }

  async save(property: Property): Promise<void> {
    const data = {
      userId: property.userId,
      companyId: property.companyId,
      managerId: property.managerId,
      locationId: property.locationId,
      rentAmount: property.rentAmount,
      rentStartDate: property.rentStartDate,
      rentEndDate: property.rentEndDate,
    }
    if (property.id === 0) {
      await this.prisma.upward_user_property.create({ data })
    } else {
      await this.prisma.upward_user_property.update({
        where: { id: property.id },
        data,
      })
    }
  }

  async update(id: number, data: Partial<Property>): Promise<void> {
    await this.prisma.upward_user_property.update({
      where: { id },
      data: data as any,
    })
  }
}

@Injectable()
export class PrismaLocationRepository implements LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Location | null> {
    const record = await this.prisma.upward_location.findUnique({
      where: { id },
    })
    return record as unknown as Location | null
  }

  async findByUuid(uuid: string): Promise<Location | null> {
    const record = await this.prisma.upward_location.findUnique({
      where: { uuid },
    })
    return record as unknown as Location | null
  }

  async save(location: Location): Promise<void> {
    const data = {
      country: location.country,
      state: location.state,
      area: location.area,
      subarea: location.subarea,
    }
    if (location.id === 0) {
      await this.prisma.upward_location.create({ data })
    } else {
      await this.prisma.upward_location.update({
        where: { id: location.id },
        data,
      })
    }
  }
}
