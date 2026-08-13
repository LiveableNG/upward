import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY, PropertyManager } from '../../domains/pm/property-manager.repository'
import { VerificationTokenRepository, VERIFICATION_TOKEN_REPOSITORY } from '../../domains/auth/verification-token.repository'
import { EmailService } from '../../shared/infrastructure/email/email.service'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { resolveCanManageCompanySettings } from '../../shared/application/pm-settings-access'
import { S3Service } from '../../shared/infrastructure/common/s3/s3.service'
import * as bcrypt from 'bcrypt'
import { BaseAuthService } from './base-auth.service'
import { EncryptionService } from '../../shared/infrastructure/common/encryption.service'
import * as crypto from 'crypto'

import { UnifiedCommunicationService } from '../../shared/infrastructure/communication/unified-communication.service'
import { EventEmitter2 } from '@nestjs/event-emitter'

@Injectable()
export class PmAuthService extends BaseAuthService {
  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
    private readonly s3Service: S3Service,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly eventEmitter: EventEmitter2,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService)
  }

  async generateFullAuthResponse(pm: PropertyManager): Promise<any> {
    const payload = {
      sub: pm.uuid,
      email: pm.email,
      role: 'PM'
    }

    const accessToken = this.generateAccessToken(payload)
    
    // Cleanup expired sessions
    await (this.prisma as any).upward_pm_auth_session.deleteMany({
      where: {
        pmId: pm.id!,
        expiresAt: { lt: new Date() },
      },
    })

    // Create New Session
    const sid = crypto.randomUUID()
    const refreshToken = this.generateRefreshToken({ sub: pm.uuid, sid, role: 'PM' })
    await (this.prisma as any).upward_pm_auth_session.create({
      data: {
        id: sid,
        pmId: pm.id!,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, id: serverId, uuid, ...rest } = pm
    const clientProfile: any = {
      id: uuid, // Map uuid to id for client
      uuid,
      ...rest
    }

    if (clientProfile.pmType === 'INDIVIDUAL_LANDLORD') {
      clientProfile.pmType = 'Landlord'
    }

    if (clientProfile.profilePic) {
      clientProfile.profilePic = await this.s3Service.getDownloadUrl(clientProfile.profilePic)
    }
    if (clientProfile.letterheadHeaderUrl) {
      clientProfile.letterheadHeaderUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadHeaderUrl)
    }
    if (clientProfile.letterheadFooterUrl) {
      clientProfile.letterheadFooterUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadFooterUrl)
    }

    clientProfile.canManageCompanySettings = await resolveCanManageCompanySettings(
      this.prisma,
      pm.id!,
    )

    return {
      accessToken,
      refreshToken,
      user: clientProfile,
    }
  }

  async signup(dto: {
    email: string
    password: string
    firstName: string
    lastName: string
    pmType?: string
    businessName?: string
    phone?: string
    country?: string
    cacNumber?: string
    personalEmail?: string
    personalPhone?: string
  }): Promise<any> {
    const existing = await this.pmRepository.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException('Property manager with this email already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const pmData: Partial<PropertyManager> = {
      uuid: crypto.randomUUID(),
      email: dto.email,
      emailHash: this.encryption.hash(dto.email),
      passwordHash,
      firstName: dto.firstName,
      firstNameHash: this.encryption.hash(dto.firstName),
      lastName: dto.lastName,
      lastNameHash: this.encryption.hash(dto.lastName),
      pmType: dto.pmType,
      businessName: dto.businessName,
      phone: dto.phone,
      phoneHash: dto.phone ? this.encryption.hash(dto.phone) : null,
      country: dto.country || null,
      cacNumber: dto.cacNumber || null,
      personalEmail: dto.personalEmail ? this.encryption.encrypt(dto.personalEmail) : null,
      personalPhone: dto.personalPhone ? this.encryption.encrypt(dto.personalPhone) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const savedPm = await this.pmRepository.save(pmData as PropertyManager)

    // Automatically create a pending verification record for the PM
    await this.prisma.upward_pm_verification.create({
      data: {
        pmId: savedPm.id!,
        idType: 'CAC',
        idNumber: dto.cacNumber || '',
        idImage: null,
        status: 'PENDING',
      }
    })

    this.emailService.sendCustomerSupportNotification('PM', savedPm.uuid).catch(e => console.error('Failed to send CS notification', e));

    this.eventEmitter.emit('pm.registered', { pmUuid: savedPm.uuid });

    return this.generateFullAuthResponse(savedPm)
  }

  async login(email: string, password: string): Promise<any> {
    const pm = await this.pmRepository.findByEmail(email)
    if (!pm) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, pm.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return this.generateFullAuthResponse(pm)
  }

  async otpLogin(email: string, otp: string): Promise<any> {
    await this.verifyOTP(email, otp, 'LOGIN')

    const pm = await this.pmRepository.findByEmail(email)
    if (!pm) throw new UnauthorizedException('Property manager account not found')

    return this.generateFullAuthResponse(pm)
  }

  async requestOTP(email: string, context: 'SIGNUP' | 'LOGIN'): Promise<{ context: 'SIGNUP' | 'LOGIN' }> {
    const existing = await this.pmRepository.findByEmail(email)
    let effectiveContext = context

    if (context === 'LOGIN' && !existing) {
      throw new UnauthorizedException('No property manager account found with this email.')
    }

    if (context === 'SIGNUP' && existing) {
      throw new ConflictException('Property manager with this email already exists')
    }

    await (this.tokenRepository as any).deleteOldTokens(email, effectiveContext)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    await this.tokenRepository.create({
      otp,
      context: effectiveContext,
      identifier: email,
      expiresAt,
    })

    await this.unifiedCommService.processCommunication({
      recipientEmail: email,
      recipientName: 'Property Manager',
      recipientRole: 'PM',
      type: 'PM_AUTH_OTP',
      context: {
        otp,
        context: effectiveContext,
        title: effectiveContext === 'SIGNUP' ? 'Create Your PM Account' : 'Secure PM Portal Login',
      },
    });
    return { context: effectiveContext }
  }

  async verifyOTP(email: string, otp: string, context: string): Promise<{ success: boolean; message?: string }> {
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

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const decoded = await this.verifyRefreshToken(refreshToken)
    const sid = decoded.sid

    if (!sid) throw new UnauthorizedException('Invalid token structure')

    const session = await (this.prisma as any).upward_pm_auth_session.findUnique({
      where: { id: sid },
    })

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session expired or revoked')
    }

    const incomingHash = this.hashToken(refreshToken)
    if (session.refreshTokenHash !== incomingHash) {
      await (this.prisma as any).upward_pm_auth_session.update({
        where: { id: sid },
        data: { isRevoked: true },
      })
      throw new UnauthorizedException('Token reuse detected')
    }

    const pm = await this.pmRepository.findByUuid(decoded.sub)
    if (!pm) throw new UnauthorizedException('PM not found')

    const newAccessToken = this.generateAccessToken({ sub: pm.uuid, email: pm.email, role: 'PM' })
    const newRefreshToken = this.generateRefreshToken({ sub: pm.uuid, sid, role: 'PM' })
    
    await (this.prisma as any).upward_pm_auth_session.update({
      where: { id: sid },
      data: {
        refreshTokenHash: this.hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, id: serverId, uuid, ...rest } = pm
    const clientProfile: any = {
      id: uuid,
      uuid,
      ...rest
    }

    if (clientProfile.pmType === 'INDIVIDUAL_LANDLORD') {
      clientProfile.pmType = 'Landlord'
    }

    if (clientProfile.profilePic) {
      clientProfile.profilePic = await this.s3Service.getDownloadUrl(clientProfile.profilePic)
    }
    if (clientProfile.letterheadHeaderUrl) {
      clientProfile.letterheadHeaderUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadHeaderUrl)
    }
    if (clientProfile.letterheadFooterUrl) {
      clientProfile.letterheadFooterUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadFooterUrl)
    }

    clientProfile.canManageCompanySettings = await resolveCanManageCompanySettings(
      this.prisma,
      serverId!,
    )

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: clientProfile,
    }
  }

  async revokeSession(refreshToken: string): Promise<void> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken)
      if (decoded.sid) {
        await (this.prisma as any).upward_pm_auth_session.update({
          where: { id: decoded.sid },
          data: { isRevoked: true },
        })
      }
    } catch {
      // Ignore
    }
  }

  async getProfile(pmUuid: string): Promise<any> {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new UnauthorizedException('PM not found')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, id: serverId, uuid, ...profile } = pm
    const clientProfile: any = {
      id: uuid,
      uuid,
      ...profile
    }

    if (clientProfile.pmType === 'INDIVIDUAL_LANDLORD') {
      clientProfile.pmType = 'Landlord'
    }

    if (clientProfile.profilePic) {
      clientProfile.profilePic = await this.s3Service.getDownloadUrl(clientProfile.profilePic)
    }
    if (clientProfile.letterheadHeaderUrl) {
      clientProfile.letterheadHeaderUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadHeaderUrl)
    }
    if (clientProfile.letterheadFooterUrl) {
      clientProfile.letterheadFooterUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadFooterUrl)
    }

    clientProfile.canManageCompanySettings = await resolveCanManageCompanySettings(
      this.prisma,
      serverId!,
    )

    return clientProfile
  }

  async checkEmail(email: string): Promise<{ exists: boolean; isInvited?: boolean; inviteToken?: string }> {
    const pm = await this.pmRepository.findByEmail(email)
    
    if (pm && pm.passwordHash === 'PENDING_INVITE') {
      return { exists: true, isInvited: true, inviteToken: pm.uuid }
    }

    return { exists: !!pm }
  }

  async getInviteDetails(uuid: string) {
    const pm = await this.pmRepository.findByUuid(uuid)
    if (!pm) throw new UnauthorizedException('Invitation not found')
    
    return {
      firstName: pm.firstName,
      lastName: pm.lastName,
      email: pm.email,
    }
  }

  async claimAccount(uuid: string, passwordHash: string, firstName?: string, lastName?: string) {
    const pm = await this.pmRepository.findByUuid(uuid)
    if (!pm) throw new UnauthorizedException('Invitation not found')

    const newPasswordHash = await bcrypt.hash(passwordHash, 10)
    
    await this.pmRepository.update(pm.id!, {
        passwordHash: newPasswordHash,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
    })


    // Update collaboration status if any
    await (this.prisma as any).upward_pm_team_collaboration.updateMany({
        where: { collaboratorPmId: pm.id },
        data: { status: 'ACCEPTED' }
    })

    this.emailService.sendCustomerSupportNotification('PM', pm.uuid).catch(e => console.error('Failed to send CS notification', e));

    return { success: true }
  }

  async forgotPassword(email: string): Promise<void> {
    const pm = await this.pmRepository.findByEmail(email)

    if (!pm) {
      // Don't reveal account existence for security, but we stop here
      return
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    await this.pmRepository.update(pm.id!, {
      resetPasswordOTP: otp,
      resetPasswordExpires: expires,
    })

    const fullName = `${pm.firstName} ${pm.lastName}`
    await this.unifiedCommService.processCommunication({
      recipientEmail: pm.email,
      recipientName: fullName,
      recipientRole: 'PM',
      type: 'PM_PASSWORD_RESET_OTP',
      context: {
        otp,
        title: 'PM Password Reset Request',
        greeting: fullName,
        message: 'We received a request to reset your password for your Upward PM account.',
        expiryText: 'This code expires in 15 minutes.',
      },
    });
  }

  async resetPassword(email: string, otp: string, newPlain: string): Promise<void> {
    const pm = await this.pmRepository.findByEmail(email)

    if (!pm || !pm.resetPasswordOTP || !pm.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    if (pm.resetPasswordOTP !== otp || new Date() > pm.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    const newPasswordHash = await bcrypt.hash(newPlain, 10)
    await this.pmRepository.update(pm.id!, {
      passwordHash: newPasswordHash,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
    })
  }

  async verifyResetOTP(email: string, otp: string): Promise<{ success: boolean }> {
    const pm = await this.pmRepository.findByEmail(email)

    if (!pm || !pm.resetPasswordOTP || !pm.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    if (pm.resetPasswordOTP !== otp || new Date() > pm.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    return { success: true }
  }
}
