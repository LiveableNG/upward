/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { TenantAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from '../auth/base-auth.service'

@Injectable()
export class TenantAuthService extends BaseAuthService {
  constructor(
    private readonly prisma: PrismaService,
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
  }): Promise<TenantAuthResponse & { refreshToken: string }> {
    const existing = await this.prisma.upward_tenant.findUnique({
      where: { email: dto.email },
    })

    if (existing) {
      throw new ConflictException('Tenant with this email already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const tenant = await this.prisma.upward_tenant.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
      },
    })

    const payload = {
      sub: tenant.id,
      email: tenant.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(tenant.id)

    return {
      accessToken,
      refreshToken,
      tenant: tenant as any,
    }
  }

  async completeProfile(dto: {
    email: string
    passwordPlain: string
    fullName: string
    phone?: string
    invitedByCompanyId?: string
    invitedByCompanyName?: string
    invitedByCompanyLogo?: string
    rentAnniversary?: string
    address?: string
    occupation?: string
    gender?: string
    dateOfBirth?: string
  }): Promise<TenantAuthResponse & { refreshToken: string }> {
    const waitlistEntry = await this.prisma.upward_waitlist.findUnique({
      where: { email: dto.email },
    })

    const passwordHash = await bcrypt.hash(dto.passwordPlain, 10)

    const tenant = await this.prisma.upward_tenant.upsert({
      where: { email: dto.email },
      update: {
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        invitedByCompanyId: dto.invitedByCompanyId,
        invitedByCompanyName: dto.invitedByCompanyName,
        invitedByCompanyLogo: dto.invitedByCompanyLogo,
        rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
        address: dto.address,
        occupation: dto.occupation,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        isConvertedFromWaitlist: !!waitlistEntry,
      },
      create: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        invitedByCompanyId: dto.invitedByCompanyId,
        invitedByCompanyName: dto.invitedByCompanyName,
        invitedByCompanyLogo: dto.invitedByCompanyLogo,
        rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
        address: dto.address,
        occupation: dto.occupation,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth,
        isConvertedFromWaitlist: !!waitlistEntry,
      },
    })

    const payload = {
      sub: tenant.id,
      email: tenant.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(tenant.id)

    return {
      accessToken,
      refreshToken,
      tenant: tenant as any,
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<TenantAuthResponse & { refreshToken: string }> {
    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { email },
    })

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, tenant.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = {
      sub: tenant.id,
      email: tenant.email,
    }

    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(tenant.id)

    return {
      accessToken,
      refreshToken,
      tenant: tenant as any,
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TenantAuthResponse & { refreshToken: string }> {
    const decoded = await this.verifyRefreshToken(refreshToken)

    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { id: decoded.sub },
    })

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found')
    }

    const payload = {
      sub: tenant.id,
      email: tenant.email,
    }

    const newAccessToken = this.generateAccessToken(payload)
    const newRefreshToken = this.generateRefreshToken(tenant.id)

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tenant: tenant as any,
    }
  }

  async getProfile(tenantId: string): Promise<any> {
    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { id: tenantId },
      include: {
        savingsGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = tenant

    return profile
  }

  async changePassword(tenantId: string, currentPlain: string, newPlain: string): Promise<void> {
    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      throw new UnauthorizedException('User not found')
    }

    const isCurrentValid = await bcrypt.compare(currentPlain, tenant.passwordHash)
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password incorrect')
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10)
    await this.prisma.upward_tenant.update({
      where: { id: tenantId },
      data: { passwordHash: newPasswordHash },
    })
  }
}
