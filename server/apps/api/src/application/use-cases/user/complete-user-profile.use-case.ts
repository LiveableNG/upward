import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY, User } from '../../../domains/users/user.repository'
import { WAITLIST_REPOSITORY, WaitlistRepository } from '../../../domains/waitlist/waitlist.repository'
import * as bcrypt from 'bcrypt'
import { UserAuthService } from '../../../application/auth/user-auth.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class CompleteUserProfileUseCase {
  private readonly logger = new Logger(CompleteUserProfileUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly userAuthService: UserAuthService,
    private readonly encryption: EncryptionService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(WAITLIST_REPOSITORY) private readonly waitlistRepository: WaitlistRepository,
  ) {}

  async execute(dto: {
    email: string
    passwordPlain: string
    fullName: string
    phone?: string
    gender?: string
    dateOfBirth?: string
    profilePic?: string
    rentEndDate?: string
    rentAmount?: number
    address?: string
    rentType?: string
    properties?: Array<{
      uuid?: string;
      address: string;
      rentEndDate: string;
      rentStartDate?: string;
      rentAmount?: number;
      rentType?: string;
      isPastTenancy?: boolean;
      companyName?: string;
      companyPhone?: string;
      companyEmail?: string;
      managerName?: string;
      managerPhone?: string;
      managerEmail?: string;
    }>
  }) {
    if (dto.phone && !/^\+234\d{10}$/.test(dto.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }
    const waitlistEntry = await this.waitlistRepository.findByEmail(dto.email)

    let passwordHash: string | undefined
    if (dto.passwordPlain && dto.passwordPlain.trim() !== '') {
      passwordHash = await bcrypt.hash(dto.passwordPlain, 10)
    }

    let user = await this.userRepository.findByEmail(dto.email)

    const nameParts = dto.fullName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const userData: any = {
      email: dto.email,
      firstName,
      lastName,
      phone: dto.phone,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      profilePic: dto.profilePic || '',
      isFromWaitlist: !!waitlistEntry,
      isFromInvite: false,
    }

    if (!user?.profileSlug) {
      const slugBase = (firstName + '-' + lastName).toLowerCase().replace(/[^a-z0-9]/g, '-')
      let candidate = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`
      
      let isUnique = false
      let attempts = 0
      while (!isUnique && attempts < 5) {
        const existing = await this.prisma.upward_user.findFirst({
          where: { profileSlug: candidate },
          select: { id: true }
        })
        if (!existing) {
          isUnique = true
        } else {
          candidate = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`
          attempts++
        }
      }
      userData.profileSlug = candidate
    }

    const properties = dto.properties || []
    if (dto.address || dto.rentEndDate) {
      properties.push({
        address: dto.address || '',
        rentEndDate: dto.rentEndDate || '',
        rentAmount: dto.rentAmount,
        rentType: dto.rentType,
      })
    }

    if (passwordHash) {
      userData.passwordHash = passwordHash
    }

    if (user) {
      await this.userRepository.update(user.id!, userData)
      user = await this.userRepository.findById(user.id!)
    } else {
      if (!passwordHash) {
        throw new Error('Password is required for new user registration')
      }
      const newUser: User = {
        ...userData,
        passwordHash,
        uuid: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await this.userRepository.save(newUser)
      user = await this.userRepository.findByEmail(dto.email)
    }

    if (!user) throw new Error('Failed to create/update user')

    // Sync Properties
    if (properties.length > 0) {
      await this.syncProperties(user.id!, properties)
    }

    await this.userAuthService.syncTenantStatuses(dto.email)

    // Reuse UserAuthService login logic to create session and tokens
    return this.userAuthService.generateFullAuthResponse(user)
  }

  private async syncProperties(userId: number, properties: Array<{
    uuid?: string;
    address: string;
    rentEndDate: string;
    rentStartDate?: string;
    rentAmount?: number;
    rentType?: string;
    isPastTenancy?: boolean;
    companyName?: string;
    managerName?: string;
    location?: {
      country?: string;
      state?: string;
      area?: string;
    }
  }>) {
    for (const prop of properties) {
      let locationId: number | undefined
      let companyId: number | undefined
      let managerId: number | undefined

      let existingProperty = null
      if (prop.uuid) {
        existingProperty = await this.prisma.upward_user_property.findFirst({
          where: { uuid: prop.uuid, userId }
        })
      }

      if (existingProperty?.locationId) {
        await this.prisma.upward_location.update({
          where: { id: existingProperty.locationId },
          data: { 
            area: prop.address || prop.location?.area || '',
            state: prop.location?.state || '',
            country: prop.location?.country || ''
          }
        })
        locationId = existingProperty.locationId
      } else {
        const location = await this.prisma.upward_location.create({
          data: {
            area: prop.address || prop.location?.area || '',
            subarea: '',
            country: prop.location?.country || '',
            state: prop.location?.state || ''
          }
        })
        locationId = location.id
      }

      // 3. Handle Company
      let propertyCompanyId: number | null | undefined = undefined;
      if (prop.companyName !== undefined) {
        if (prop.companyName && prop.companyName.trim() !== '') {
          const nameHash = this.encryption.hash(prop.companyName);
          let company = await this.prisma.upward_company.findFirst({
            where: { nameHash }
          });
          if (!company) {
            company = await this.prisma.upward_company.create({
              data: { 
                name: this.encryption.encrypt(prop.companyName),
                nameHash 
              }
            });
          }
          companyId = company.id;
          propertyCompanyId = companyId;
        } else {
          propertyCompanyId = null;
        }
      } else if (existingProperty?.companyId) {
        companyId = existingProperty.companyId;
        propertyCompanyId = companyId;
      }

      // 4. Handle Manager
      let propertyManagerId: number | null | undefined = undefined;
      if (prop.managerName !== undefined) {
        if (prop.managerName && prop.managerName.trim() !== '') {
          let managerCompanyId = companyId;
          
          if (!managerCompanyId) {
            const fallbackCompanyName = "Independent Management";
            const fallbackNameHash = this.encryption.hash(fallbackCompanyName);
            let fallbackCompany = await this.prisma.upward_company.findFirst({
              where: { nameHash: fallbackNameHash }
            });
            if (!fallbackCompany) {
              fallbackCompany = await this.prisma.upward_company.create({
                data: {
                  name: this.encryption.encrypt(fallbackCompanyName),
                  nameHash: fallbackNameHash
                }
              });
            }
            managerCompanyId = fallbackCompany.id;
          }

          const firstNameHash = this.encryption.hash(prop.managerName);
          let manager = await this.prisma.upward_manager.findFirst({
            where: { firstNameHash, companyId: managerCompanyId }
          });
          if (!manager) {
            manager = await this.prisma.upward_manager.create({
              data: { 
                firstName: this.encryption.encrypt(prop.managerName),
                firstNameHash,
                companyId: managerCompanyId 
              }
            });
          }
          managerId = manager.id;
          propertyManagerId = managerId;
        } else {
          propertyManagerId = null;
        }
      } else if (existingProperty?.managerId) {
        managerId = existingProperty.managerId;
        propertyManagerId = managerId;
      }

      const propertyData: any = {
        userId,
        locationId,
        companyId: propertyCompanyId,
        managerId: propertyManagerId,
        rentAmount: prop.rentAmount || 0,
        rentEndDate: prop.rentEndDate ? new Date(prop.rentEndDate) : null,
        isPastTenancy: !!prop.isPastTenancy,
        rentType: prop.rentType || 'Annually',
      }

      if (prop.rentStartDate) {
        propertyData.rentStartDate = new Date(prop.rentStartDate)
      }
      if (prop.rentAmount !== undefined) {
         const paid = existingProperty?.amountPaid || 0;
         propertyData.amountRemaining = Math.max(0, prop.rentAmount - Number(paid));
      }

      if (existingProperty) {
        await this.prisma.upward_user_property.update({
          where: { id: existingProperty.id },
          data: propertyData
        })
      } else {
        await this.prisma.upward_user_property.create({
          data: {
            ...propertyData,
            uuid: crypto.randomUUID()
          }
        })
      }
    }
  }
}
