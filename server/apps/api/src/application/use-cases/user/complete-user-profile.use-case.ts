import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY, User } from '../../../domains/users/user.repository'
import { WAITLIST_REPOSITORY, WaitlistRepository } from '../../../domains/waitlist/waitlist.repository'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'

@Injectable()
export class CompleteUserProfileUseCase {
  private readonly logger = new Logger(CompleteUserProfileUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(WAITLIST_REPOSITORY) private readonly waitlistRepository: WaitlistRepository,
  ) {}

  async execute(dto: {
    email: string
    passwordPlain: string
    fullName: string
    phone?: string
    occupation?: string
    gender?: string
    dateOfBirth?: string
    profilePic?: string
    rentEndDate?: string
    address?: string
    properties?: Array<{
      address: string;
      rentEndDate: string;
      companyName?: string;
      managerName?: string;
    }>
  }) {
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
      occupation: dto.occupation,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      profilePic: dto.profilePic || '',
      rentEndDate: dto.rentEndDate ? new Date(dto.rentEndDate) : null,
      address: dto.address || '',
      isFromWaitlist: !!waitlistEntry,
      isFromInvite: false,
    }

    const properties = dto.properties || []
    if (dto.address || dto.rentEndDate) {
      properties.push({
        address: dto.address || '',
        rentEndDate: dto.rentEndDate || '',
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

    const payload = { sub: user.uuid, email: user.email }
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'super-secret-key'),
      expiresIn: '1h',
    })
    const refreshToken = this.jwtService.sign(
      { sub: user.id!, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET', 'super-refresh-secret-key'),
        expiresIn: '7d',
      },
    )

    return {
      accessToken,
      refreshToken,
      user,
    }
  }

  private async syncProperties(userId: number, properties: Array<{
    uuid?: string;
    address: string;
    rentEndDate: string;
    companyName?: string;
    managerName?: string;
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
          data: { area: prop.address || '' }
        })
        locationId = existingProperty.locationId
      } else {
        const location = await this.prisma.upward_location.create({
          data: {
            area: prop.address || '',
            subarea: '',
            country: 'Nigeria',
            state: 'Lagos'
          }
        })
        locationId = location.id
      }

      if (prop.companyName) {
        let company = await this.prisma.upward_company.findFirst({
          where: { name: prop.companyName }
        })
        if (!company) {
          company = await this.prisma.upward_company.create({
            data: { name: prop.companyName }
          })
        }
        companyId = company.id
      }

      if (prop.managerName && companyId) {
        let manager = await this.prisma.upward_manager.findFirst({
          where: { firstName: prop.managerName, companyId }
        })
        if (!manager) {
          manager = await this.prisma.upward_manager.create({
            data: { firstName: prop.managerName, companyId }
          })
        }
        managerId = manager.id
      }

      const propertyData = {
        userId,
        locationId,
        companyId,
        managerId,
        rentEndDate: prop.rentEndDate ? new Date(prop.rentEndDate) : null,
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
