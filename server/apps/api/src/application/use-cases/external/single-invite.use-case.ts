import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { 
  CompanyRepository, 
  COMPANY_REPOSITORY, 
  MANAGER_REPOSITORY, 
  ManagerRepository,
  COMPANY_USER_REPOSITORY,
  CompanyUserRepository
} from '../../../domains/companies/company.repository'
import { 
  PropertyRepository, 
  PROPERTY_REPOSITORY, 
  LOCATION_REPOSITORY, 
  LocationRepository 
} from '../../../domains/companies/property.repository'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { randomUUID } from 'crypto'

export interface CompanyInfo {
  uuid?: string
  name?: string
  address?: string
}

export interface UserInfo {
  email: string
  firstName: string
  lastName: string
  phone?: string
}

export interface LocationInfo {
  country: string
  state: string
  area: string
  subarea?: string
  address?: string
}

export interface RentInfo {
  rentAmount: number
  rentStartDate: string
  rentEndDate: string
}

export interface ManagerInfo {
  uuid?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export interface InviteRequest {
  company: CompanyInfo
  invite: {
    user: UserInfo
    property: {
      location: LocationInfo
      rent: RentInfo
      manager: ManagerInfo
    }
  }
}
  const frontendUrl = process.env['FRONTEND_URL']
  const urls = frontendUrl
    ? frontendUrl.split(',').map((url) => url.trim())
    : ['http://localhost:3000', 'http://localhost:5173']

@Injectable()
export class SingleInviteUseCase {
  private readonly logger = new Logger(SingleInviteUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    @Inject(MANAGER_REPOSITORY) private readonly managerRepository: ManagerRepository,
    @Inject(COMPANY_USER_REPOSITORY) private readonly companyUserRepository: CompanyUserRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepository: LocationRepository,
  ) {}

  async execute(payload: InviteRequest, platformId?: number): Promise<any> {
    const result = await this.setupInviteContext(payload, platformId);
    
    return {
      userId: result.user.uuid,
      managerId: result.manager.uuid,
      companyId: result.company.uuid,
      userPropertyUuid: result.property.uuid,
      email: result.user.email,
      inviteLink: urls[0] + `/invite/${result.user.uuid}`
    }
  }

  async setupInviteContext(payload: InviteRequest, platformId?: number): Promise<{
    user: any,
    company: any,
    manager: any,
    property: any,
    location: any
  }> {
    const { company: companyData, invite } = payload

    // 1. Find or Create Company
    let company = companyData.uuid 
      ? await this.companyRepository.findByUuid(companyData.uuid)
      : (companyData.name ? await this.companyRepository.findByName(companyData.name) : null)

    if (!company) {
      if (!companyData.name) {
        throw new BadRequestException('Company name is required for new company')
      }
      company = await this.companyRepository.save({
        uuid: randomUUID(),
        name: companyData.name,
        address: companyData.address,
        platformId: platformId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    } else {
      const updateData: any = {}
      if (companyData.name && company.name !== companyData.name) updateData.name = companyData.name
      if (companyData.address && company.address !== companyData.address) updateData.address = companyData.address
      
      if (Object.keys(updateData).length > 0) {
        company = await this.companyRepository.update(company.id!, updateData)
      }
    }

    // 2. Find or Create Manager
    const managerData = invite.property.manager
    let manager = managerData.uuid
      ? await this.managerRepository.findByUuid(managerData.uuid)
      : (managerData.email ? await this.managerRepository.findByEmail(managerData.email) : null)

    if (!manager) {
      if (!managerData.firstName || !managerData.lastName || !managerData.email) {
        throw new BadRequestException('Manager details (firstName, lastName, email) are required for new manager')
      }
      manager = await this.managerRepository.save({
        uuid: randomUUID(),
        companyId: company.id!,
        firstName: managerData.firstName,
        lastName: managerData.lastName,
        email: managerData.email,
        phone: managerData.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    } else {
      const updateData: any = {}
      if (managerData.firstName && manager.firstName !== managerData.firstName) updateData.firstName = managerData.firstName
      if (managerData.lastName && manager.lastName !== managerData.lastName) updateData.lastName = managerData.lastName
      if (managerData.email && manager.email !== managerData.email) updateData.email = managerData.email
      if (managerData.phone && manager.phone !== managerData.phone) updateData.phone = managerData.phone
      
      if (Object.keys(updateData).length > 0) {
        manager = await this.managerRepository.update(manager.id!, updateData)
      }
    }

    // 3. Find or Create User
    const userData = invite.user
    let user = await this.userRepository.findByEmail(userData.email)

    if (!user) {
      user = await this.userRepository.save({
        uuid: randomUUID(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        passwordHash: 'INVITED',
        isFromInvite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    }

    const existingLink = await this.companyUserRepository.findByCompanyAndUser(company.id!, user.id!)

    if (!existingLink) {
      await this.companyUserRepository.save({
        companyId: company.id!,
        userId: user.id!,
        invitedAt: new Date(),
      } as any)
    } else {
      await this.companyUserRepository.update(existingLink.id!, { invitedAt: new Date() })
    }

    const locData = invite.property.location
    const rentData = invite.property.rent

    if (!rentData.rentAmount || !rentData.rentEndDate) {
      throw new BadRequestException('Rent amount and rent end date are compulsory for invitation');
    }

    // 4. Find or Create Location
    let location = await this.locationRepository.findByAddress(
      locData.address || '',
      locData.area || '',
      locData.state || '',
      locData.country || 'Nigeria'
    )

    if (!location) {
      location = await this.locationRepository.save({
        uuid: randomUUID(),
        country: locData.country || 'Nigeria',
        state: locData.state || '',
        area: locData.area || '',
        subarea: locData.subarea || '',
        address: locData.address || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    }

    // 5. Find or Create Property (Scoped to User + Company + Location)
    const existingProperties = await this.propertyRepository.findByUserId(user.id!)
    let property = existingProperties.find((p: any) => 
      p.companyId === company.id! && p.locationId === location!.id!
    )

    if (property) {
      if (property.rentAmount !== rentData.rentAmount) {
        property = await this.propertyRepository.update(property.id!, { 
          rentAmount: rentData.rentAmount,
          managerId: manager.id, // Update manager if changed
          rentEndDate: new Date(rentData.rentEndDate),
          rentStartDate: rentData.rentStartDate ? new Date(rentData.rentStartDate) : property.rentStartDate
        })
      }
    } else {
      property = await this.propertyRepository.save({
        uuid: randomUUID(),
        userId: user.id!,
        companyId: company.id!,
        managerId: manager.id!,
        locationId: location.id!,
        rentAmount: rentData.rentAmount,
        rentEndDate: new Date(rentData.rentEndDate),
        rentStartDate: rentData.rentStartDate ? new Date(rentData.rentStartDate) : undefined,
        currency: (rentData as any).currency || 'NGN',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    }

    return { user, company, manager, property, location }
  }
}
