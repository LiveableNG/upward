import { Injectable, UnauthorizedException, ConflictException, Inject, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository, USER_REPOSITORY, User } from '../../domains/users/user.repository'
import { VerificationTokenRepository, VERIFICATION_TOKEN_REPOSITORY } from '../../domains/auth/verification-token.repository'
import { EmailService } from '../../shared/infrastructure/email/email.service'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../shared/infrastructure/common/s3/s3.service'
import * as bcrypt from 'bcrypt'
import { UserAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from './base-auth.service'
import { EncryptionService } from '../../shared/infrastructure/common/encryption.service'

@Injectable()
export class UserAuthService extends BaseAuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
    private readonly s3Service: S3Service,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService)
  }

  async generateFullAuthResponse(user: User): Promise<UserAuthResponse & { refreshToken: string }> {
    const payload = {
      sub: user.uuid,
      email: user.email,
    }

    const accessToken = this.generateAccessToken(payload)
    // Cleanup expired sessions for this user
    await this.prisma.upward_auth_session.deleteMany({
      where: {
        userId: user.id!,
        expiresAt: { lt: new Date() },
      },
    })

    // Limit active sessions to 5
    const activeSessions = await this.prisma.upward_auth_session.findMany({
      where: { userId: user.id! },
      orderBy: { expiresAt: 'desc' },
      select: { id: true },
    })

    if (activeSessions.length >= 5) {
      const sessionsToDelete = activeSessions.slice(4).map(s => s.id)
      await this.prisma.upward_auth_session.deleteMany({
        where: { id: { in: sessionsToDelete } },
      })
    }

    // Create New Session
    const sid = crypto.randomUUID()
    const refreshToken = this.generateRefreshToken({ sub: user.uuid, sid })
    await this.prisma.upward_auth_session.create({
      data: {
        id: sid,
        userId: user.id!,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userNoPass } = user
    if (userNoPass.profilePic) {
      userNoPass.profilePic = await this.s3Service.getDownloadUrl(userNoPass.profilePic)
    }
    return {
      accessToken,
      refreshToken,
      user: userNoPass as any,
    }
  }

  async signup(dto: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    properties?: Array<{
      uuid?: string;
      address: string;
      subarea?: string;
      state?: string;
      country?: string;
      rentDueDate?: string;
      rentAmount?: number;
      companyName?: string;
      companyPhone?: string;
      companyEmail?: string;
      managerName?: string;
      managerPhone?: string;
      managerEmail?: string;
      isPastTenancy?: boolean;
    }>
    isFromWaitlist?: boolean
    isFromInvite?: boolean
  }): Promise<UserAuthResponse & { refreshToken: string }> {
    if (dto.phone && !/^\+234\d{10}$/.test(dto.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }
    const existing = await this.userRepository.findByEmail(dto.email)

    if (existing) {
      if (existing.passwordHash === 'INVITED' || !existing.passwordHash) {
        const passwordHash = await bcrypt.hash(dto.password, 10)
        await this.userRepository.update(existing.id!, {
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          firstNameHash: (this.userRepository as any).encryption.hash(dto.firstName),
          lastNameHash: (this.userRepository as any).encryption.hash(dto.lastName),
          phoneHash: dto.phone ? (this.userRepository as any).encryption.hash(dto.phone) : null,
        })
        const user = await this.userRepository.findByEmail(dto.email)
        if (!user) throw new Error('Failed to update user after invite conversion')
        
        if (dto.properties && dto.properties.length > 0) {
          await this.syncProperties(user.id!, dto.properties)
        }
        await this.syncTenantStatuses(dto.email)
        return this.generateFullAuthResponse(user)
      }
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
    if (dto.properties && dto.properties.length > 0) {
      await this.syncProperties(user.id!, dto.properties)
    }

    await this.syncTenantStatuses(dto.email)

    return this.generateFullAuthResponse(user)
  }

  async login(
    email: string,
    password: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.passwordHash === 'INVITED') {
      throw new ForbiddenException({
        message: 'Your account was invited by a property manager. Complete your profile to login.',
        code: 'INVITE_PENDING',
        userId: user.uuid
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = {
      sub: user.uuid,
      email: user.email,
    }

    return this.generateFullAuthResponse(user)
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    const decoded = await this.verifyRefreshToken(refreshToken)
    const sid = decoded.sid

    if (!sid) {
      throw new UnauthorizedException('Invalid token structure')
    }

    const session = await this.prisma.upward_auth_session.findUnique({
      where: { id: sid },
    })

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session expired or revoked')
    }

    // REUSE DETECTION
    const incomingHash = this.hashToken(refreshToken)
    if (session.refreshTokenHash !== incomingHash) {
      // Token reused! Revoke the entire session for safety
      await this.prisma.upward_auth_session.update({
        where: { id: sid },
        data: { isRevoked: true },
      })
      throw new UnauthorizedException('Token reuse detected')
    }

    const user = await this.userRepository.findByUuid(decoded.sub)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Rotate the token
    const newAccessToken = this.generateAccessToken({ sub: user.uuid, email: user.email })
    const newRefreshToken = this.generateRefreshToken({ sub: user.uuid, sid })
    
    await this.prisma.upward_auth_session.update({
      where: { id: sid },
      data: {
        refreshTokenHash: this.hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    const { passwordHash: _, ...userNoPass } = user
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userNoPass as any,
    }
  }

  async revokeSession(refreshToken: string): Promise<void> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken)
      if (decoded.sid) {
        await this.prisma.upward_auth_session.update({
          where: { id: decoded.sid },
          data: { isRevoked: true },
        })
      }
    } catch {
      // Ignore errors during logout
    }
  }

  async getProfile(userUuid: string): Promise<any> {
    const user = await this.userRepository.findByUuid(userUuid)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = user

    if (profile.profilePic) {
      profile.profilePic = await this.s3Service.getDownloadUrl(profile.profilePic)
    }

    return profile
  }

  async updateProfile(userUuid: string, data: Partial<User>): Promise<any> {
    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new UnauthorizedException('User not found')

    if (data.phone && !/^\+234\d{10}$/.test(data.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }

    await this.userRepository.update(user.id!, data as any)

    // Sync Property logic
    const propertyList = (data as any).properties || []

    if (propertyList.length > 0) {
      await this.syncProperties(user.id!, propertyList)
    }

    return this.getProfile(userUuid)
  }

  private async syncProperties(userId: number, properties: Array<{
    uuid?: string;
    address: string;
    subarea?: string;
    state?: string;
    country?: string;
    rentDueDate?: string;
    rentStartDate?: string;
    rentAmount?: number;
    companyName?: string;
    managerName?: string;
    companyEmail?: string;
    companyPhone?: string;
    managerEmail?: string;
    managerPhone?: string;
    location?: {
      country?: string;
      state?: string;
      area?: string;
      subarea?: string;
      address?: string;
    }
    isPastTenancy?: boolean;
  }>) {
    const phoneRegex = /^\+234\d{10}$/;
    for (const prop of properties) {
      if (prop.companyPhone && !phoneRegex.test(prop.companyPhone)) {
        throw new Error('Company phone must be in format +2348000000000');
      }
      if (prop.managerPhone && !phoneRegex.test(prop.managerPhone)) {
        throw new Error('Manager phone must be in format +2348000000000');
      }
      let locationId: number | undefined
      let companyId: number | undefined
      let managerId: number | undefined

      // 1. Check if we're updating an existing property
      let existingProperty = null
      if (prop.uuid) {
        existingProperty = await this.prisma.upward_user_property.findFirst({
          where: { uuid: prop.uuid, userId }
        })
      }

      // 2. Handle Location
      const locationData = {
        area: prop.location?.area || prop.address || '',
        subarea: prop.location?.subarea || prop.subarea || '',
        address: prop.location?.address || '',
        state: prop.location?.state || prop.state || '',
        country: prop.location?.country || prop.country || ''
      }

      if (existingProperty?.locationId) {
        await this.prisma.upward_location.update({
          where: { id: existingProperty.locationId },
          data: locationData
        })
        locationId = existingProperty.locationId
      } else {
        const location = await this.prisma.upward_location.create({
          data: locationData
        })
        locationId = location.id
      }

      // 3. Handle Company
      let propertyCompanyId: number | null | undefined = undefined;
      
      if (prop.companyName !== undefined) {
        if (prop.companyName && prop.companyName.trim() !== '') {
          const nameHash = this.encryption.hash(prop.companyName)
          let company = await this.prisma.upward_company.findFirst({
            where: { nameHash }
          })
          if (!company) {
            company = await this.prisma.upward_company.create({
              data: { 
                name: this.encryption.encrypt(prop.companyName),
                nameHash,
                email: prop.companyEmail ? this.encryption.encrypt(prop.companyEmail) : null,
                emailHash: prop.companyEmail ? this.encryption.hash(prop.companyEmail) : null,
                phone: prop.companyPhone ? this.encryption.encrypt(prop.companyPhone) : null,
                phoneHash: prop.companyPhone ? this.encryption.hash(prop.companyPhone) : null
              }
            })
          } else if (prop.companyEmail || prop.companyPhone) {
            const updateData: any = {}
            if (prop.companyEmail) {
              updateData.email = this.encryption.encrypt(prop.companyEmail)
              updateData.emailHash = this.encryption.hash(prop.companyEmail)
            }
            if (prop.companyPhone) {
              updateData.phone = this.encryption.encrypt(prop.companyPhone)
              updateData.phoneHash = this.encryption.hash(prop.companyPhone)
            }
            await this.prisma.upward_company.update({
              where: { id: company.id },
              data: updateData
            })
          }
          companyId = company.id
          propertyCompanyId = companyId
        } else {
          propertyCompanyId = null; // Clear company if empty string provided
        }
      } else if (existingProperty?.companyId) {
        companyId = existingProperty.companyId
        propertyCompanyId = companyId
      }

      // 4. Handle Manager
      let propertyManagerId: number | null | undefined = undefined;

      if (prop.managerName !== undefined) {
        if (prop.managerName && prop.managerName.trim() !== '') {
          let managerCompanyId = companyId;
          
          if (!managerCompanyId) {
            const fallbackCompanyName = "Independent Management";
            const fallbackNameHash = this.encryption.hash(fallbackCompanyName);
            
            let fallbackCompany = await this.prisma.upward_company.findFirst({
              where: { nameHash: fallbackNameHash }
            });
            
            if (!fallbackCompany) {
              fallbackCompany = await this.prisma.upward_company.create({
                data: {
                  name: this.encryption.encrypt(fallbackCompanyName),
                  nameHash: fallbackNameHash
                }
              });
            }
            managerCompanyId = fallbackCompany.id;
          }

          const firstNameHash = this.encryption.hash(prop.managerName)
          let manager = await this.prisma.upward_manager.findFirst({
            where: { firstNameHash, companyId: managerCompanyId }
          })
          if (!manager) {
            manager = await this.prisma.upward_manager.create({
              data: { 
                firstName: this.encryption.encrypt(prop.managerName),
                firstNameHash,
                companyId: managerCompanyId,
                email: prop.managerEmail ? this.encryption.encrypt(prop.managerEmail) : null,
                emailHash: prop.managerEmail ? this.encryption.hash(prop.managerEmail) : null,
                phone: prop.managerPhone ? this.encryption.encrypt(prop.managerPhone) : null,
                phoneHash: prop.managerPhone ? this.encryption.hash(prop.managerPhone) : null
              }
            })
          } else if (prop.managerEmail || prop.managerPhone) {
            const updateData: any = {}
            if (prop.managerEmail) {
              updateData.email = this.encryption.encrypt(prop.managerEmail)
              updateData.emailHash = this.encryption.hash(prop.managerEmail)
            }
            if (prop.managerPhone) {
              updateData.phone = this.encryption.encrypt(prop.managerPhone)
              updateData.phoneHash = this.encryption.hash(prop.managerPhone)
            }
            await this.prisma.upward_manager.update({
              where: { id: manager.id },
              data: updateData
            })
          }
          managerId = manager.id
          propertyManagerId = managerId
        } else {
          propertyManagerId = null; // Clear manager if empty string provided
        }
      } else if (existingProperty?.managerId) {
        managerId = existingProperty.managerId
        propertyManagerId = managerId
      }

      // 5. Create or Update Property
      const propertyData: any = {
        userId,
        locationId,
        companyId: propertyCompanyId, // Link property to company ONLY if name was provided
        managerId: propertyManagerId,
        rentAmount: prop.rentAmount || (prop as any).rentAmount || 0,
        rentEndDate: prop.rentDueDate ? new Date(prop.rentDueDate) : (prop as any).rentEndDate ? new Date((prop as any).rentEndDate) : null,
        isPastTenancy: prop.isPastTenancy ?? (prop as any).isPastTenancy ?? false,
      }

      // Only update rentStartDate if provided (avoid overwriting existing value with null)
      if (prop.rentStartDate || (prop as any).rentStartDate) {
        propertyData.rentStartDate = new Date(prop.rentStartDate || (prop as any).rentStartDate)
      } else if (!existingProperty && propertyData.rentEndDate) {
        // Automatically default rentStartDate to 1 year before rentEndDate if brand new
        const defaultStart = new Date(propertyData.rentEndDate)
        defaultStart.setFullYear(defaultStart.getFullYear() - 1)
        propertyData.rentStartDate = defaultStart
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
    await this.syncTenantStatuses(email)
  }

  async checkEmail(email: string): Promise<{ exists: boolean; hasPassword?: boolean; isInvited?: boolean }> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) return { exists: false }
    const isInvited = user.passwordHash === 'INVITED'
    return {
      exists: true,
      isInvited,
      hasPassword: !!user.passwordHash && user.passwordHash !== '' && !isInvited,
    }
  }

  async requestOTP(email: string, context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT'): Promise<void> {
    // 1. Delete any old OTPs for this email/context
    await this.tokenRepository.deleteOldTokens(email, context)

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    // 3. Create token record
    await this.tokenRepository.create({
      otp,
      context,
      identifier: email,
      expiresAt,
    })

    // 4. Send email
    await this.emailService.sendAuthOTP(email, otp, context)
  }

  async verifyOTP(email: string, otp: string, context: string, deleteOnSuccess = true): Promise<{ success: boolean; message?: string }> {
    const record = await this.tokenRepository.findByIdentifier(email, context)

    if (!record || !record.otp || record.expiresAt < new Date()) {
      return { success: false, message: 'Invalid or expired verification code' }
    }

    if (record.otp !== otp) {
      return { success: false, message: 'Invalid verification code' }
    }

    // OTP is valid!
    if (deleteOnSuccess) {
      await this.tokenRepository.delete(record.id!)
    }
    return { success: true }
  }

  maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return email

    if (local.length <= 2) {
      return local[0] + '***@' + domain
    }

    if (local.length <= 4) {
      return local[0] + '***' + local[local.length - 1] + '@' + domain
    }

    return local.substring(0, 2) + '***' + local.substring(local.length - 1) + '@' + domain
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email)
  }

  public async syncTenantStatuses(email: string) {
    try {
      const emailHash = this.encryption.hash(email)
      await this.prisma.upward_pm_tenant.updateMany({
        where: {
          emailHash,
          inviteStatus: { in: ['PENDING', 'SENT'] }
        },
        data: {
          inviteStatus: 'ON_UPWARD'
        }
      })
    } catch (error) {
      console.error('Failed to sync tenant statuses:', error)

    }
  }
}
