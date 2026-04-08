import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '@domains/users/user.repository'
import { CompanyRepository, COMPANY_REPOSITORY, MANAGER_REPOSITORY, ManagerRepository } from '@domains/companies/company.repository'
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
  ) {}

  async execute(payload: InviteRequest, platformId?: number): Promise<any> {
    const { company: companyData, invite } = payload

    let company = companyData.id 
      ? await this.companyRepository.findById(companyData.id)
      : (companyData.name ? await this.companyRepository.findByName(companyData.name) : null)

    if (!company) {
      if (!companyData.name) {
        throw new BadRequestException('Company name is required for new company')
      }
      const companyUuid = randomUUID()
      await this.companyRepository.save({
        uuid: companyUuid,
        name: companyData.name,
        address: companyData.address,
        platformId: platformId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      company = await this.companyRepository.findByUuid(companyUuid)
    } else {
      // Update company details if they changed and provided
      const updateData: any = {}
      if (companyData.name && company.name !== companyData.name) updateData.name = companyData.name
      if (companyData.address && company.address !== companyData.address) updateData.address = companyData.address
      
      if (Object.keys(updateData).length > 0) {
        await this.companyRepository.update(company.id, updateData)
      }
    }
    if (!company) throw new Error('Failed to handle company')

    const managerData = invite.property.manager
    let manager = managerData.id
      ? await this.managerRepository.findById(managerData.id)
      : (managerData.email ? await this.managerRepository.findByEmail(managerData.email) : null)

    if (!manager) {
      if (!managerData.firstName || !managerData.lastName || !managerData.email) {
        throw new BadRequestException('Manager details (firstName, lastName, email) are required for new manager')
      }
      const managerUuid = randomUUID()
      await this.managerRepository.save({
        uuid: managerUuid,
        companyId: company.id,
        firstName: managerData.firstName,
        lastName: managerData.lastName,
        email: managerData.email,
        phone: managerData.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      manager = await this.managerRepository.findByUuid(managerUuid)
    } else {
      // Update manager details if they changed and provided
      const updateData: any = {}
      if (managerData.firstName) updateData.firstName = managerData.firstName
      if (managerData.lastName) updateData.lastName = managerData.lastName
      if (managerData.email) updateData.email = managerData.email
      if (managerData.phone) updateData.phone = managerData.phone
      
      if (Object.keys(updateData).length > 0) {
        await this.managerRepository.update(manager.id, updateData)
      }
    }

    if (!manager) throw new Error('Failed to handle manager')

    // 3. Find or Create User
    const userData = invite.user
    let user = await this.userRepository.findByEmail(userData.email)

    if (!user) {
      const userUuid = randomUUID()

      await this.userRepository.save({
        uuid: userUuid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        passwordHash: 'INVITED',
        isFromInvite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      user = await this.userRepository.findByUuid(userUuid)
    }

    if (!user) throw new Error('Failed to handle user')


    const existingLink = await this.prisma.upward_company_user.findUnique({
      where: {
        companyId_userId: { companyId: company.id, userId: user.id }
      }
    })

    if (!existingLink) {
      await this.prisma.upward_company_user.create({
        data: {
          company: { connect: { id: company.id } },
          user: { connect: { id: user.id } },
          invitedAt: new Date(),
        }
      })
    } else {
      await this.prisma.upward_company_user.update({
        where: { id: existingLink.id },
        data: { invitedAt: new Date() }
      })
    }

    const locData = invite.property.location
    const rentData = invite.property.rent

    const location = await this.prisma.upward_location.create({
      data: {
        uuid: randomUUID(),
        country: locData.country || 'Nigeria',
        state: locData.state || '',
        area: locData.area || '',
        subarea: locData.subarea || locData.address || ''
      }
    })

    await this.prisma.upward_user_property.create({
      data: {
        uuid: randomUUID(),
        user: { connect: { id: user.id } },
        company: company.id ? { connect: { id: company.id } } : undefined,
        manager: manager.id ? { connect: { id: manager.id } } : undefined,
        location: location.id ? { connect: { id: location.id } } : undefined,
        rentAmount: rentData.rentAmount || 0,
        rentStartDate: rentData.rentStartDate ? new Date(rentData.rentStartDate) : null,
        rentEndDate: rentData.rentEndDate ? new Date(rentData.rentEndDate) : null,
      }
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
