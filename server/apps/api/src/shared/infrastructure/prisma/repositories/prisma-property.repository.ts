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

  async save(property: Property): Promise<Property> {
    const data = {
      userId: property.userId,
      companyId: property.companyId,
      managerId: property.managerId,
      locationId: property.locationId,
      rentAmount: property.rentAmount,
      currency: property.currency,
      rentStartDate: property.rentStartDate,
      rentEndDate: property.rentEndDate,
    }
    const record = property.id
      ? await this.prisma.upward_user_property.update({
          where: { id: property.id },
          data,
        })
      : await this.prisma.upward_user_property.create({ data })
    return record as unknown as Property
  }

  async update(id: number, data: Partial<Property>): Promise<Property> {
    const record = await this.prisma.upward_user_property.update({
      where: { id },
      data: data as any,
    })
    return record as unknown as Property
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

  async save(location: Location): Promise<Location> {
    const data = {
      country: location.country,
      state: location.state,
      area: location.area,
      subarea: location.subarea,
      address: (location as any).address,
    }
    const record = location.id
      ? await this.prisma.upward_location.update({
          where: { id: location.id },
          data,
        })
      : await this.prisma.upward_location.create({ data })
    return record as unknown as Location
  }
}
