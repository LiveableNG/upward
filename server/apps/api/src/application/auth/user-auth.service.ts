import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository, USER_REPOSITORY, User } from '@domains/users/user.repository'
import { EmailService } from '@shared/infrastructure/email/email.service'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
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
    rentAnniversary?: string
    address?: string
    city?: string
    country?: string
    isFromWaitlist?: boolean
    isFromInvite?: boolean
  }): Promise<UserAuthResponse & { refreshToken: string }> {
    const existing = await this.userRepository.findByEmail(dto.email)

    if (existing) {
      throw new ConflictException('User with this email already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const addressConcatenated = [dto.address, dto.city, dto.country].filter(Boolean).join(', ')
    const userData: Partial<User> = {
      uuid: crypto.randomUUID(),
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
      address: addressConcatenated,
      isFromWaitlist: dto.isFromWaitlist ?? false,
      isFromInvite: dto.isFromInvite ?? false,
      useBiometrics: false,
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

    // Create a property record for the user if rentAnniversary is provided
    if (dto.rentAnniversary || dto.address || dto.city || dto.country) {
      await this.syncPropertyData(user.id, {
        rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
        address: dto.address,
        city: dto.city,
        country: dto.country
      } as any)
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

  async updateProfile(userUuid: string, data: Partial<User> & { city?: string; country?: string }): Promise<any> {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')

    if (data.city || data.country) {
      const street = data.address || user.address?.split(',')[0] || ''
      data.address = [street, data.city, data.country].filter(Boolean).join(', ')
    }

    await this.userRepository.update(user.id, data as any)

    // Sync Location and Property logic
    if (data.address || data.rentAnniversary || data.city || data.country) {
      await this.syncPropertyData(user.id, data)
    }

    return this.getProfile(userUuid)
  }

  private async syncPropertyData(userId: number, data: Partial<User> & { city?: string; country?: string }) {
    // 1. Find or Create Property
    const existingProperty = await this.prisma.upward_user_property.findFirst({
      where: { userId }
    })

    let locationId = existingProperty?.locationId

    // 2. Handle Location Update if address is provided
    if (data.address || data.city || data.country) {
      if (locationId) {
        await this.prisma.upward_location.update({
          where: { id: locationId },
          data: { 
            area: data.address || '',
            state: data.city || '',
            country: data.country || ''
          }
        })
      } else {
        const newLocation = await this.prisma.upward_location.create({
          data: {
            country: data.country || 'Nigeria', // Default
            state: data.city || 'Lagos',   // Default
            area: data.address || '',
            subarea: ''
          }
        })
        locationId = newLocation.id
      }
    }

    // 3. Update/Create Property
    const propertyPayload: any = {
      userId,
      rentEndDate: data.rentAnniversary ? new Date(data.rentAnniversary) : (data as any).rentAnniversary === null ? null : undefined
    }

    if (locationId) {
      propertyPayload.locationId = locationId
    }

    if (existingProperty) {
      await this.prisma.upward_user_property.update({
        where: { id: existingProperty.id },
        data: propertyPayload
      })
    } else {
      await this.prisma.upward_user_property.create({
        data: {
          ...propertyPayload,
          uuid: crypto.randomUUID()
        }
      })
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
    await this.userRepository.update(user.id, { passwordHash: newPasswordHash })
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      // Don't reveal account existence for security, but we stop here
      return
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    await this.userRepository.update(user.id, {
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
    await this.userRepository.update(user.id, {
      passwordHash: newPasswordHash,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
    })
  }
}
