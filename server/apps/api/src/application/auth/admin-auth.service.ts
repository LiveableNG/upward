import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { AdminRole, AdminJwtPayload, AdminAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from './base-auth.service'

@Injectable()
export class AdminAuthService extends BaseAuthService {
  constructor(
    private readonly prisma: PrismaService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService)
  }

  async login(
    email: string,
    password: string,
  ): Promise<AdminAuthResponse & { refreshToken: string }> {
    const admin = await this.prisma.upward_admin.findUnique({
      where: { email },
    })

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      mustChangePassword: admin.mustChangePassword,
    }

    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.generateRefreshToken(payload)

    return {
      accessToken,
      refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role as AdminRole,
        mustChangePassword: admin.mustChangePassword,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<AdminAuthResponse & { refreshToken: string }> {
    const decoded = await this.verifyRefreshToken(refreshToken)

    const admin = await this.prisma.upward_admin.findUnique({
      where: { id: decoded.sub },
    })

    if (!admin) {
      throw new UnauthorizedException('Admin not found')
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      mustChangePassword: admin.mustChangePassword,
    }

    const newAccessToken = this.generateAccessToken(payload)
    const newRefreshToken = this.generateRefreshToken(payload)

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role as AdminRole,
        mustChangePassword: admin.mustChangePassword,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    }
  }

  async validateUser(payload: AdminJwtPayload) {
    const admin = await this.prisma.upward_admin.findUnique({
      where: { id: payload.sub },
    })

    if (!admin) {
      return null
    }

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      mustChangePassword: admin.mustChangePassword,
    }
  }
}
