/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { EmailService } from '@shared/infrastructure/email/email.service'
import * as bcrypt from 'bcrypt'
import { UserAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from './base-auth.service'

@Injectable()
export class UserAuthService extends BaseAuthService {
  constructor(
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
    fullName: string
    phone?: string
    rentAnniversary?: string
    address?: string
  }): Promise<UserAuthResponse & { refreshToken: string }> {
    const existing = await this.prisma.upward_user.findUnique({
      where: { email: dto.email },
    })

    if (existing) {
      throw new ConflictException('User with this email already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.upward_user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
        address: dto.address,
        isProfileComplete: false,
        hasDismissedAppBanner: false,
        useBiometrics: false,
      },
    })

    const payload = {
      sub: user.id,
      email: user.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(user.id)

    return {
      accessToken,
      refreshToken,
      user: user as any,
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    const user = await this.prisma.upward_user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = {
      sub: user.id,
      email: user.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(user.id)

    return {
      accessToken,
      refreshToken,
      user: user as any,
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    const decoded = await this.verifyRefreshToken(refreshToken)

    const user = await this.prisma.upward_user.findUnique({
      where: { id: decoded.sub },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const payload = {
      sub: user.id,
      email: user.email,
    }

    const newAccessToken = this.generateAccessToken(payload)
    const newRefreshToken = this.generateRefreshToken(user.id)

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: user as any,
    }
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.prisma.upward_user.findUnique({
      where: { id: userId },
      include: {
        savingsGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = user

    return profile
  }

  async changePassword(userId: string, currentPlain: string, newPlain: string): Promise<void> {
    const user = await this.prisma.upward_user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const isCurrentValid = await bcrypt.compare(currentPlain, user.passwordHash)
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password incorrect')
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10)
    await this.prisma.upward_user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.upward_user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal account existence for security, but we stop here
      return
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    await this.prisma.upward_user.update({
      where: { id: user.id },
      data: {
        resetPasswordOTP: otp,
        resetPasswordExpires: expires,
      },
    })

    await this.emailService.sendPasswordResetOTP(user.email, user.fullName, otp)
  }

  async resetPassword(email: string, otp: string, newPlain: string): Promise<void> {
    const user = await this.prisma.upward_user.findUnique({
      where: { email },
    })

    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    if (user.resetPasswordOTP !== otp || new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10)
    await this.prisma.upward_user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordOTP: null,
        resetPasswordExpires: null,
      },
    })
  }
}
