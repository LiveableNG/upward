import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'
import {
  Property,
  Location,
  PropertyRepository,
  LocationRepository,
} from '../../../../domains/companies/property.repository'

@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findById(id: number, tx?: Prisma.TransactionClient): Promise<Property | null> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user_property.findUnique({
      where: { id },
      include: { location: true }
    })
    return record as unknown as Property | null
  }

  async findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<Property | null> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_user_property.findUnique({
      where: { uuid },
      include: {
        company: true,
        manager: true,
        location: true,
        pm: true,
        pmUnit: {
          include: { property: true }
        }
      },
    })
    if (!record) return null

    const result = { ...record } as any
    if (result.company) {
      result.company.name = this.encryption.decrypt(result.company.name)
    }
    if (result.manager) {
      result.manager.firstName = this.encryption.decrypt(result.manager.firstName)
      result.manager.lastName = this.encryption.decrypt(result.manager.lastName)
    } else if (result.pm) {
      // Fallback to PM Manager for Upward Pay UI consistency
      result.manager = {
        firstName: this.encryption.decrypt(result.pm.firstName),
        lastName: this.encryption.decrypt(result.pm.lastName),
        email: this.encryption.decrypt(result.pm.email),
        phone: result.pm.phone ? this.encryption.decrypt(result.pm.phone) : undefined,
      }
      if (result.pm.businessName) {
        result.company = {
          name: this.encryption.decrypt(result.pm.businessName)
        }
      }
    }

    return result as unknown as Property
  }

  async findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<Property[]> {
    const prisma = tx || this.prisma
    const records = await prisma.upward_user_property.findMany({
      where: { userId },
      include: { 
        location: true,
        pm: true,
        pmUnit: {
          include: { property: true }
        }
      }
    })
    return records.map(record => {
      const result = { ...record } as any
      if (result.pm && !result.manager) {
        result.manager = {
          firstName: this.encryption.decrypt(result.pm.firstName),
          lastName: this.encryption.decrypt(result.pm.lastName),
          email: this.encryption.decrypt(result.pm.email),
          phone: result.pm.phone ? this.encryption.decrypt(result.pm.phone) : undefined,
        }
        if (result.pm.businessName && !result.company) {
          result.company = {
            name: this.encryption.decrypt(result.pm.businessName)
          }
        }
      }
      return result
    }) as unknown as Property[]
  }

  async save(property: Property, tx?: Prisma.TransactionClient): Promise<Property> {
    const prisma = tx || this.prisma
    const data: any = {
      uuid: property.uuid,
      userId: property.userId,
      companyId: property.companyId,
      managerId: property.managerId,
      locationId: property.locationId,
      rentAmount: property.rentAmount,
      currency: property.currency,
      rentStartDate: property.rentStartDate,
      rentEndDate: property.rentEndDate,
      isVerified: property.isVerified,
      isPastTenancy: property.isPastTenancy,
      pmId: property.pmId,
      pmUnitId: property.pmUnitId,
      amountPaid: property.amountPaid,
      amountRemaining: property.amountRemaining,
    }
    if (property.subaccountId !== undefined) {
      data.subaccountId = property.subaccountId
    }
    const record = property.id
      ? await prisma.upward_user_property.update({
          where: { id: property.id },
          data,
        })
      : await prisma.upward_user_property.create({ data })
    return record as unknown as Property
  }

  async update(id: number, data: Partial<Property>, tx?: Prisma.TransactionClient): Promise<Property> {
    const prisma = tx || this.prisma
    const prismaData: any = { ...data }
    delete prismaData.company
    delete prismaData.manager
    delete prismaData.location
    delete prismaData.pm
    delete prismaData.pmUnit
    delete prismaData.subaccount
    const record = await prisma.upward_user_property.update({
      where: { id },
      data: prismaData,
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

  async findByAddress(address: string, area: string, state: string, country: string): Promise<Location | null> {
    const record = await this.prisma.upward_location.findFirst({
      where: {
        address: { equals: address, mode: 'insensitive' },
        area: { equals: area, mode: 'insensitive' },
        state: { equals: state, mode: 'insensitive' },
        country: { equals: country, mode: 'insensitive' },
      },
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
