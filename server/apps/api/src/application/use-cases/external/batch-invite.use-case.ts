import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '@domains/users/user.repository'
import { CompanyRepository, COMPANY_REPOSITORY } from '@domains/companies/company.repository'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'
import { randomUUID } from 'crypto'

export interface CompanyInfo {
  name: string
  address?: string
  profilePic?: string
}

export interface ManagerInfo {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface InviteRequest {
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  state?: string
  area?: string
  subarea?: string
  country?: string
  rentAmount?: number
  rentStartDate?: string
  rentEndDate?: string
}

@Injectable()
export class BatchInviteUseCase {
  private readonly logger = new Logger(BatchInviteUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(payload: { company: CompanyInfo; manager?: ManagerInfo; invites: InviteRequest[] }): Promise<any[]> {
    if (!payload.company || !payload.company.name) {
      throw new BadRequestException('Company name is required')
    }

    // 1. Find or Create Company
    let company = await this.prisma.upward_company.findFirst({
      where: { name: payload.company.name }
    })

    if (!company) {
      company = await this.prisma.upward_company.create({
        data: {
          uuid: randomUUID(),
          name: payload.company.name,
          address: payload.company.address,
          profilePic: payload.company.profilePic,
        }
      })
    } else if (payload.company.address) {
      await this.prisma.upward_company.update({
        where: { id: company.id },
        data: {
          profilePic: payload.company.profilePic || company.profilePic,
          address: payload.company.address || company.address
        }
      })
    }

    // 2. Find or Create Manager (Optional)
    let managerId: number | undefined
    if (payload.manager && payload.manager.email) {
      const managerEmailHash = this.encryption.hash(payload.manager.email)
      let manager = await this.prisma.upward_manager.findUnique({
        where: { emailHash: managerEmailHash }
      })

      if (!manager) {
        manager = await this.prisma.upward_manager.create({
          data: {
            uuid: randomUUID(),
            companyId: company.id,
            firstName: this.encryption.encrypt(payload.manager.firstName),
            lastName: this.encryption.encrypt(payload.manager.lastName),
            email: this.encryption.encrypt(payload.manager.email),
            emailHash: managerEmailHash,
            phone: payload.manager.phone ? this.encryption.encrypt(payload.manager.phone) : null,
          }
        })
      }
      managerId = manager.id
    }

    const results = []

    for (const invite of payload.invites) {
      try {
        const result = await this.handleSingleInvite(company.id, managerId, invite)
        results.push({ email: invite.email, ...result })
      } catch (error: any) {
        this.logger.error(`Failed to invite ${invite.email}: ${error.message}`)
        results.push({ email: invite.email, success: false, error: error.message })
      }
    }

    return results
  }

  private async handleSingleInvite(companyId: number, managerId: number | undefined, invite: InviteRequest) {
    const emailHash = this.encryption.hash(invite.email)
    
    // 1. Find or Create User
    let user = await this.prisma.upward_user.findUnique({
      where: { emailHash }
    })

    if (!user) {
      const addressParts = [invite.address, invite.area, invite.subarea, invite.state || invite.city, invite.country]
        .filter(Boolean)
      const addressConcatenated = addressParts.join(', ')
      
      user = await this.prisma.upward_user.create({
        data: {
          uuid: randomUUID(),
          email: invite.email,
          emailHash: emailHash,
          firstName: invite.firstName,
          lastName: invite.lastName,
          phone: invite.phone,
          address: addressConcatenated,
          passwordHash: 'INVITED',
          isFromInvite: true,
          useBiometrics: false,
        }
      })
    }

    // 2. Refresh Link User to Company (allow multiple links or updates)
    await this.prisma.upward_company_user.upsert({
      where: {
        companyId_userId: { companyId, userId: user.id }
      },
      update: {
        invitedAt: new Date(), // Re-invite / Refresh
      },
      create: {
        companyId,
        userId: user.id,
        invitedAt: new Date(),
      }
    })

    // 3. Handle Location & Property
    const location = await this.prisma.upward_location.create({
      data: {
        country: invite.country || 'Nigeria',
        state: invite.state || invite.city || '',
        area: invite.area || invite.address || '',
        subarea: invite.subarea || ''
      }
    })

    await this.prisma.upward_user_property.create({
      data: {
        uuid: randomUUID(),
        userId: user.id,
        companyId,
        managerId, // Link to manager who invited
        locationId: location.id,
        rentAmount: invite.rentAmount || 0,
        rentStartDate: invite.rentStartDate ? new Date(invite.rentStartDate) : null,
        rentEndDate: invite.rentEndDate ? new Date(invite.rentEndDate) : null,
      }
    })

    return {
      success: true,
      inviteLink: `https://upward.pay/invite/${user.uuid}`
    }
  }
}
