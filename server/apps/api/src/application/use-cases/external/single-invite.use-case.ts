import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '@domains/users/user.repository'
import { 
  CompanyRepository, 
  COMPANY_REPOSITORY, 
  MANAGER_REPOSITORY, 
  ManagerRepository,
  COMPANY_USER_REPOSITORY,
  CompanyUserRepository
} from '@domains/companies/company.repository'
import { 
  PropertyRepository, 
  PROPERTY_REPOSITORY, 
  LOCATION_REPOSITORY, 
  LocationRepository 
} from '@domains/companies/property.repository'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'
import { randomUUID } from 'crypto'

export interface CompanyInfo {
  id?: number
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
  id?: number
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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

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
    const { company: companyData, invite } = payload

    // 1. Find or Create Company
    let company = companyData.id 
      ? await this.companyRepository.findById(companyData.id)
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
      // Update company details if they changed and provided
      const updateData: any = {}
      if (companyData.name && company.name !== companyData.name) updateData.name = companyData.name
      if (companyData.address && company.address !== companyData.address) updateData.address = companyData.address
      
      if (Object.keys(updateData).length > 0) {
        company = await this.companyRepository.update(company.id!, updateData)
      }
    }

    // 2. Find or Create Manager
    const managerData = invite.property.manager
    let manager = managerData.id
      ? await this.managerRepository.findById(managerData.id)
      : (managerData.email ? await this.managerRepository.findByEmail(managerData.email) : null)

    if (!manager) {
      if (!managerData.firstName || !managerData.lastName || !managerData.email) {
        throw new BadRequestException('Manager details (firstName, lastName, email) are required for new manager')
      }
      manager = await this.managerRepository.save({
        uuid: randomUUID(),
        companyId: company.id,
        firstName: managerData.firstName,
        lastName: managerData.lastName,
        email: managerData.email,
        phone: managerData.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    } else {
      // Update manager details if they changed and provided
      const updateData: any = {}
      if (managerData.firstName) updateData.firstName = managerData.firstName
      if (managerData.lastName) updateData.lastName = managerData.lastName
      if (managerData.email) updateData.email = managerData.email
      if (managerData.phone) updateData.phone = managerData.phone
      
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

    // 4. Link User to Company
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

    // 5. Create Location and Property
    const locData = invite.property.location
    const rentData = invite.property.rent

    const location = await this.locationRepository.save({
      uuid: randomUUID(),
      country: locData.country || 'Nigeria',
      state: locData.state || '',
      area: locData.area || '',
      subarea: locData.subarea || '',
      address: locData.address || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await this.propertyRepository.save({
      uuid: randomUUID(),
      userId: user.id!,
      companyId: company.id!,
      managerId: manager.id!,
      locationId: location.id!,
      rentAmount: rentData.rentAmount || 0,
      rentStartDate: rentData.rentStartDate ? new Date(rentData.rentStartDate) : undefined,
      rentEndDate: rentData.rentEndDate ? new Date(rentData.rentEndDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return [
      {
        userId: user.uuid,
        managerId: manager.uuid,
        companyId: company.uuid,
        email: user.email,
        inviteLink:  FRONTEND_URL + `/invite/${user.uuid}`
      }
    ]
  }
}
