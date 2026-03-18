import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { AdminRole, JwtPayload, AuthResponse } from '@upward/shared-types'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse & { refreshToken: string }> {
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

    const payload: JwtPayload = {
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

  generateRefreshToken(payload: JwtPayload): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET', 'super-refresh-secret-key')
    return this.jwtService.sign({ sub: payload.sub, type: 'refresh' }, { secret, expiresIn: '7d' })
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse & { refreshToken: string }> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET', 'super-refresh-secret-key')
    let decoded: { sub: string; type: string }
    try {
      decoded = this.jwtService.verify(refreshToken, { secret }) as { sub: string; type: string }
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type')
    }

    const admin = await this.prisma.upward_admin.findUnique({
      where: { id: decoded.sub },
    })

    if (!admin) {
      throw new UnauthorizedException('Admin not found')
    }

    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      mustChangePassword: admin.mustChangePassword,
    }

    // Rotate refresh token on every use
    const newAccessToken = this.jwtService.sign(payload)
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

  async validateUser(payload: JwtPayload) {
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
