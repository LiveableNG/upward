import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { AdminRole, JwtPayload, AuthResponse } from '@upward/shared-types'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
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

    return {
      accessToken: this.jwtService.sign(payload),
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
