import { Prisma } from '@prisma/client'

export interface Property {
  id?: number
  uuid: string
  userId: number
  companyId: number
  managerId?: number
  locationId?: number
  rentAmount: number
  amountPaid: number
  amountRemaining: number
  rentStartDate?: Date
  rentEndDate?: Date
  currency: string
  isVerified?: boolean
  isPastTenancy?: boolean
  rentType?: string
  createdAt: Date
  updatedAt: Date
  company?: { name: string }
  manager?: { firstName: string; lastName: string }
  location?: Location
  pmId?: number
  pmUnitId?: number
  pm?: { firstName: string; lastName: string; businessName?: string }
  pmUnit?: { unitName: string; property?: { name: string } }
  subaccountId?: number
}

export interface Location {
  id?: number
  uuid: string
  country: string
  state: string
  area: string
  subarea?: string
  address?: string
  createdAt: Date
  updatedAt: Date
}

export interface PropertyRepository {
  findById(id: number, tx?: Prisma.TransactionClient): Promise<Property | null>
  findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<Property | null>
  findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<Property[]>
  save(property: Property, tx?: Prisma.TransactionClient): Promise<Property>
  update(id: number, data: Partial<Property>, tx?: Prisma.TransactionClient): Promise<Property>
}

export interface LocationRepository {
  findById(id: number): Promise<Location | null>
  findByUuid(uuid: string): Promise<Location | null>
  findByAddress(address: string, area: string, state: string, country: string): Promise<Location | null>
  save(location: Location): Promise<Location>
}

export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY')
export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY')
