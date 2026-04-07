import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository, USER_REPOSITORY, User } from '@domains/users/user.repository'
import { EmailService } from '@shared/infrastructure/email/email.service'
import * as bcrypt from 'bcrypt'
import { UserAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from './base-auth.service'

@Injectable()
export class UserAuthService extends BaseAuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
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
      lastName: dto.lastName,
      phone: dto.phone,
      rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
      address: dto.address,
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

    await this.userRepository.update(user.id, data)
    return this.getProfile(userUuid)
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
