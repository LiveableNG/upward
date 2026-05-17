import { Injectable, UnauthorizedException, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { ILandlordRepository, PM_LANDLORD_REPOSITORY, LandlordEntity } from '../../domains/pm/ILandlordRepository'
import { VerificationTokenRepository, VERIFICATION_TOKEN_REPOSITORY } from '../../domains/auth/verification-token.repository'
import { EmailService } from '../../shared/infrastructure/email/email.service'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { BaseAuthService } from './base-auth.service'
import { EncryptionService } from '../../shared/infrastructure/common/encryption.service'
import * as crypto from 'crypto'

@Injectable()
export class LandlordAuthService extends BaseAuthService {
  constructor(
    @Inject(PM_LANDLORD_REPOSITORY) private readonly landlordRepository: ILandlordRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService)
  }

  async generateFullAuthResponse(landlord: LandlordEntity): Promise<any> {
    const payload = {
      sub: landlord.uuid,
      email: landlord.email,
      role: 'LANDLORD'
    }

    const accessToken = this.generateAccessToken(payload)
    
    // Cleanup expired sessions
    await (this.prisma as any).upward_pm_landlord_auth_session.deleteMany({
      where: {
        landlordId: landlord.id!,
        expiresAt: { lt: new Date() },
      },
    })

    // Create New Session
    const sid = crypto.randomUUID()
    const refreshToken = this.generateRefreshToken({ sub: landlord.uuid, sid, role: 'LANDLORD' })
    await (this.prisma as any).upward_pm_landlord_auth_session.create({
      data: {
        id: sid,
        landlordId: landlord.id!,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, id: serverId, ...rest } = landlord
    
    return {
      accessToken,
      refreshToken,
      user: {
          id: landlord.uuid,
          ...rest
      },
    }
  }

  async login(email: string, password: string): Promise<any> {
    const landlord = await this.landlordRepository.findByEmail(email)
    if (!landlord) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, landlord.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return this.generateFullAuthResponse(landlord)
  }

  async otpLogin(email: string, otp: string): Promise<any> {
    await this.verifyOTP(email, otp, 'LANDLORD_LOGIN')

    const landlord = await this.landlordRepository.findByEmail(email)
    if (!landlord) throw new UnauthorizedException('Landlord account not found')

    return this.generateFullAuthResponse(landlord)
  }

  async requestOTP(email: string): Promise<{ success: boolean }> {
    const landlord = await this.landlordRepository.findByEmail(email);
    if (!landlord) {
      throw new UnauthorizedException('No account found for this email address');
    }

    const context = 'LANDLORD_LOGIN'
    await (this.tokenRepository as any).deleteOldTokens(email, context)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    await this.tokenRepository.create({
      otp,
      context,
      identifier: email,
      expiresAt,
    })

    await this.emailService.sendAuthOTP(email, otp, 'LOGIN', 'FOREST') 
    return { success: true }
  }

  async verifyOTP(email: string, otp: string, context: string): Promise<{ success: boolean }> {
    const record = await this.tokenRepository.findByIdentifier(email, context)

    if (!record || !record.otp || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    if (record.otp !== otp) {
      throw new UnauthorizedException('Invalid verification code')
    }

    await this.tokenRepository.delete(record.id!)
    return { success: true }
  }

  async checkExistence(email: string): Promise<{ exists: boolean }> {
    const landlord = await this.landlordRepository.findByEmail(email);
    return { exists: !!landlord };
  }

  async changePassword(landlordUuid: string, newPasswordHash: string): Promise<void> {
      const landlord = await this.landlordRepository.findByUuid(landlordUuid);
      if (!landlord) throw new UnauthorizedException('Landlord not found');

      await this.landlordRepository.update(landlordUuid, {
          passwordHash: newPasswordHash,
          mustChangePassword: false
      });
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const decoded = await this.verifyRefreshToken(refreshToken)
    const sid = decoded.sid

    if (!sid) throw new UnauthorizedException('Invalid token structure')

    const session = await (this.prisma as any).upward_pm_landlord_auth_session.findUnique({
      where: { id: sid },
    })

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session expired or revoked')
    }

    const incomingHash = this.hashToken(refreshToken)
    if (session.refreshTokenHash !== incomingHash) {
      await (this.prisma as any).upward_pm_landlord_auth_session.update({
        where: { id: sid },
        data: { isRevoked: true },
      })
      throw new UnauthorizedException('Token reuse detected')
    }

    const landlord = await this.landlordRepository.findByUuid(decoded.sub)
    if (!landlord) throw new UnauthorizedException('Landlord not found')

    const newAccessToken = this.generateAccessToken({ sub: landlord.uuid, email: landlord.email, role: 'LANDLORD' })
    const newRefreshToken = this.generateRefreshToken({ sub: landlord.uuid, sid, role: 'LANDLORD' })
    
    await (this.prisma as any).upward_pm_landlord_auth_session.update({
      where: { id: sid },
      data: {
        refreshTokenHash: this.hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, id: serverId, ...rest } = landlord
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
          id: landlord.uuid,
          ...rest
      },
    }
  }

  async requestOTPSignup(email: string): Promise<{ success: boolean }> {
    const landlord = await this.landlordRepository.findByEmail(email);
    if (landlord && !landlord.mustChangePassword) {
      throw new UnauthorizedException('An account already exists with this email address');
    }

    const context = 'LANDLORD_SIGNUP'
    await (this.tokenRepository as any).deleteOldTokens(email, context)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    await this.tokenRepository.create({
      otp,
      context,
      identifier: email,
      expiresAt,
    })

    await this.emailService.sendAuthOTP(email, otp, 'SIGNUP', 'FOREST') 
    return { success: true }
  }

  async signup(dto: { email: string; password: string; firstName: string; lastName: string; phone?: string }): Promise<any> {
    const existing = await this.landlordRepository.findByEmail(dto.email);
    if (existing && !existing.mustChangePassword) {
      throw new UnauthorizedException('An account already exists with this email address');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let landlord;
    if (existing) {
      // Claim the existing account created by the Property Manager
      landlord = await this.landlordRepository.update(existing.uuid, {
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || undefined,
        mustChangePassword: false,
      });
    } else {
      // Create a brand new account
      const uuid = crypto.randomUUID();
      landlord = await this.landlordRepository.create({
        uuid,
        email: dto.email,
        emailHash: this.encryption.hash(dto.email),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || undefined,
        mustChangePassword: false,
      });
    }

    return this.generateFullAuthResponse(landlord);
  }
}
