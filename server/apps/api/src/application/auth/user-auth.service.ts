import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository, USER_REPOSITORY, User } from '../../domains/users/user.repository'
import { EmailService } from '../../shared/infrastructure/email/email.service'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { UserAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from './base-auth.service'

@Injectable()
export class UserAuthService extends BaseAuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService)
  }

  async signup(dto: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    rentEndDate?: string
    address?: string
    properties?: Array<{
      address: string;
      rentEndDate: string;
      companyName?: string;
      managerName?: string;
    }>
    isFromWaitlist?: boolean
    isFromInvite?: boolean
  }): Promise<UserAuthResponse & { refreshToken: string }> {
    const existing = await this.userRepository.findByEmail(dto.email)

    if (existing) {
      throw new ConflictException('User with this email already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const userData: Partial<User> = {
      uuid: crypto.randomUUID(),
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      firstNameHash: (this.userRepository as any).encryption.hash(dto.firstName),
      lastName: dto.lastName,
      lastNameHash: (this.userRepository as any).encryption.hash(dto.lastName),
      phone: dto.phone,
      phoneHash: dto.phone ? (this.userRepository as any).encryption.hash(dto.phone) : null,
      rentEndDate: dto.rentEndDate ? new Date(dto.rentEndDate) : undefined,
      isFromWaitlist: dto.isFromWaitlist ?? false,
      isFromInvite: dto.isFromInvite ?? false,
    }

    await this.userRepository.save(userData as User)
    const user = await this.userRepository.findByEmail(dto.email)

    if (!user) throw new Error('Failed to create user')

    const payload = {
      sub: user.uuid,
      email: user.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(user.uuid)

    const { passwordHash: _, ...userNoPass } = user

    // Create/Sync properties
    const propertyList = dto.properties || []
    if (dto.address || dto.rentEndDate) {
      propertyList.push({
        address: dto.address || '',
        rentEndDate: dto.rentEndDate || '',
      })
    }

    if (propertyList.length > 0) {
      await this.syncProperties(user.id!, propertyList)
    }

    return {
      accessToken,
      refreshToken,
      user: userNoPass as any,
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = {
      sub: user.uuid,
      email: user.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(user.uuid)

    const { passwordHash: _, ...userNoPass } = user
    return {
      accessToken,
      refreshToken,
      user: userNoPass as any,
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    const decoded = await this.verifyRefreshToken(refreshToken)

    const user = await this.userRepository.findByUuid(decoded.sub)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const payload = {
      sub: user.uuid,
      email: user.email,
    }

    const newAccessToken = this.generateAccessToken(payload)
    const newRefreshToken = this.generateRefreshToken(user.uuid)

    const { passwordHash: _, ...userNoPass } = user
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userNoPass as any,
    }
  }

  async getProfile(userUuid: string): Promise<any> {
    const user = await this.userRepository.findByUuid(userUuid)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = user

    return profile
  }

  async updateProfile(userUuid: string, data: Partial<User>): Promise<any> {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')


    await this.userRepository.update(user.id!, data as any)

    // Sync Location and Property logic
    const propertyList = (data as any).properties || []
    if ((data as any).address || (data as any).rentEndDate) {
      propertyList.push({
        address: (data as any).address || '',
        rentEndDate: (data as any).rentEndDate || '',
      })
    }

    if (propertyList.length > 0) {
      await this.syncProperties(user.id!, propertyList)
    }

    return this.getProfile(userUuid)
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
      let propertyId: number | undefined

      // 1. Check if we're updating an existing property
      let existingProperty = null
      if (prop.uuid) {
        existingProperty = await this.prisma.upward_user_property.findFirst({
          where: { uuid: prop.uuid, userId }
        })
      }

      // 2. Handle Location
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

      // 3. Handle Company
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

      // 4. Handle Manager
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

      // 5. Create or Update Property
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

  async changePassword(userUuid: string, currentPlain: string, newPlain: string): Promise<void> {
    const user = await this.userRepository.findByUuid(userUuid)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const isCurrentValid = await bcrypt.compare(currentPlain, user.passwordHash)
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password incorrect')
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10)
    await this.userRepository.update(user.id!, { passwordHash: newPasswordHash })
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      // Don't reveal account existence for security, but we stop here
      return
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    await this.userRepository.update(user.id!, {
      resetPasswordOTP: otp,
      resetPasswordExpires: expires,
    })

    const fullName = `${user.firstName} ${user.lastName}`
    await this.emailService.sendPasswordResetOTP(user.email, fullName, otp)
  }

  async resetPassword(email: string, otp: string, newPlain: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email)

    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    if (user.resetPasswordOTP !== otp || new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10)
    await this.userRepository.update(user.id!, {
      passwordHash: newPasswordHash,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
    })
  }
}
