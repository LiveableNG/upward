import { Injectable, UnauthorizedException, ConflictException, Inject, ForbiddenException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository, USER_REPOSITORY, User, PASS_PLACEHOLDERS } from '../../domains/users/user.repository'
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
      rentType?: string;
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
    dateOfBirth?: string
  }): Promise<UserAuthResponse & { refreshToken: string }> {
    if (dto.phone && !/^\+234\d{10}$/.test(dto.phone)) {
      throw new Error('Phone number must be in format +2348000000000');
    }
    const existing = await this.userRepository.findByEmail(dto.email)

    if (existing) {
      const isShadow = existing.passwordHash === PASS_PLACEHOLDERS.INVITED || 
                       existing.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
                       !!(existing.passwordHash && !existing.passwordHash.startsWith('$2'));

      if (isShadow || !existing.passwordHash) {
        const passwordHash = await bcrypt.hash(dto.password, 10)
        await this.userRepository.update(existing.id!, {
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
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
      dateOfBirth: dto.dateOfBirth,
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

    const isShadow = user.passwordHash === PASS_PLACEHOLDERS.INVITED || 
                     user.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
                     !!(user.passwordHash && !user.passwordHash.startsWith('$2'));

    if (isShadow) {
      throw new ForbiddenException({
        message: 'Your account was invited by a property manager. Complete your profile to login.',
        code: 'INVITE_PENDING',
        userId: user.uuid
      })
    }

    if (user.passwordHash === PASS_PLACEHOLDERS.SOCIAL || user.authProvider === 'google') {
      throw new ForbiddenException({
        message: 'This account uses Google sign-in. Please continue with Google.',
        code: 'SOCIAL_AUTH_REQUIRED',
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

    profile.properties = (user.properties || []).map(p => ({
      ...p,
      verificationStatus: p.verificationStatus || (p.isVerified ? 'VERIFIED' : 'PENDING'),
    }))

    ;(profile as any).verificationOn = process.env.VERIFICATION_ON !== 'false'

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
    rentType?: string;
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
          const companyEmailHash = prop.companyEmail ? this.encryption.hash(prop.companyEmail) : null
          
          let company = null
          
          if (companyEmailHash) {
            company = await this.prisma.upward_company.findUnique({
              where: { emailHash: companyEmailHash }
            })
          }
          
          if (!company) {
            company = await this.prisma.upward_company.findFirst({
              where: { nameHash }
            })
          }
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
          const managerEmailHash = prop.managerEmail ? this.encryption.hash(prop.managerEmail) : null
          
          let manager = null
          
          // Try finding by email first as it is unique
          if (managerEmailHash) {
            manager = await this.prisma.upward_manager.findUnique({
              where: { emailHash: managerEmailHash }
            })
          }
          
          // Fallback to name + company if no email or not found by email
          if (!manager) {
            manager = await this.prisma.upward_manager.findFirst({
              where: { firstNameHash, companyId: managerCompanyId }
            })
          }

          if (!manager) {
            manager = await this.prisma.upward_manager.create({
              data: { 
                firstName: this.encryption.encrypt(prop.managerName),
                firstNameHash,
                companyId: managerCompanyId,
                email: prop.managerEmail ? this.encryption.encrypt(prop.managerEmail) : null,
                emailHash: managerEmailHash,
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
        rentType: prop.rentType || (prop as any).rentType || 'Annually',
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
        if (existingProperty.isVerified) {
          continue;
        }
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

  async checkEmail(email: string): Promise<{ 
    exists: boolean; 
    hasPassword?: boolean; 
    isInvited?: boolean; 
    isWaitlist?: boolean;
    uuid?: string;
    authProvider?: string;
  }> {
    const user = await this.userRepository.findByEmail(email)
    
    if (!user) {
      const waitlistEntry = await this.prisma.upward_waitlist.findFirst({
        where: { 
          email,
          role: { not: 'OWNER' }
        }
      })
      if (waitlistEntry) {
        return { 
          exists: true, 
          isWaitlist: true, 
        }
      }
      return { exists: false }
    }

    const isShadow = user.passwordHash === PASS_PLACEHOLDERS.INVITED || 
                     user.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
                     !!(user.passwordHash && !user.passwordHash.startsWith('$2'));
    const isSocial = user.passwordHash === PASS_PLACEHOLDERS.SOCIAL || user.authProvider === 'google'
    return {
      exists: true,
      isInvited: isShadow,
      hasPassword: !!user.passwordHash && user.passwordHash !== '' && !isShadow && !isSocial,
      authProvider: user.authProvider ?? 'email',
    }

  }

  async requestOTP(email: string, context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT' | 'WAITLIST'): Promise<{ context: string }> {
    const existing = await this.userRepository.findByEmail(email)
    let effectiveContext = context

    if (context === 'LOGIN' && !existing) {
      throw new UnauthorizedException('No account found with this email address.')
    }

    if (context === 'WAITLIST') {
      const entry = await this.prisma.upward_waitlist.findFirst({
        where: { 
          email,
          role: { not: 'OWNER' }
        }
      })
      if (!entry) throw new ForbiddenException('You are not on the priority waitlist.')
    }

    if (context === 'SIGNUP' && existing && existing.passwordHash && existing.passwordHash !== 'INVITED') {
      // Seamlessly switch to login flow
      effectiveContext = 'LOGIN'
    }

    // 1. Delete any old OTPs for this email/context
    await this.tokenRepository.deleteOldTokens(email, effectiveContext)

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    // 3. Create token record
    await this.tokenRepository.create({
      otp,
      context: effectiveContext as any,
      identifier: email,
      expiresAt,
    })

    // 4. Send email
    await this.emailService.sendAuthOTP(email, otp, effectiveContext as any)
    return { context: effectiveContext }
  }

  async verifyOTP(email: string, otp: string, context: string, deleteOnSuccess = true): Promise<{ success: boolean; message?: string; inviteToken?: string }> {
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

    if (context === 'INVITE') {
      const user = await this.userRepository.findByEmail(email)
      if (user) {
        const inviteToken = crypto.randomUUID()
        await this.tokenRepository.create({
          uuid: crypto.randomUUID(),
          token: inviteToken,
          context: 'INVITE',
          identifier: user.uuid,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        })
        return { success: true, inviteToken }
      }
    }

    if (context === 'WAITLIST') {
      const entry = await this.prisma.upward_waitlist.findFirst({
        where: { 
          email,
          role: { not: 'OWNER' }
        }
      })
      if (entry) {
        return { success: true, inviteToken: entry.uuid }
      }
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

  async socialSignIn(
    provider: 'google',
    idToken: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    if (provider !== 'google') {
      throw new BadRequestException('Unsupported social provider')
    }

    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID')
    if (!googleClientId) {
      throw new BadRequestException('Google sign-in is not configured')
    }

    let payload: {
      sub?: string
      email?: string
      email_verified?: string | boolean
      given_name?: string
      family_name?: string
      name?: string
      aud?: string
      error?: string
    }

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      )
      payload = await response.json()
    } catch {
      throw new UnauthorizedException('Invalid Google sign-in token')
    }

    if (payload.error || payload.aud !== googleClientId) {
      throw new UnauthorizedException('Invalid Google sign-in token')
    }

    const providerId = payload.sub
    const email = payload.email?.toLowerCase().trim()

    if (!providerId || !email) {
      throw new UnauthorizedException('Google account is missing required profile information')
    }



    if (payload.email_verified === false || payload.email_verified === 'false') {
      throw new UnauthorizedException('Google email is not verified')
    }

    const nameParts = (payload.name || '').trim().split(/\s+/).filter(Boolean)
    const rawFirstName = payload.given_name || nameParts[0] || 'User'
    const rawLastName = payload.family_name || nameParts.slice(1).join(' ') || ''

    // Sanitise names to prevent email strings from being stored
    const isEmail = (val: string) => val.includes('@')
    const firstName = isEmail(rawFirstName) ? 'User' : rawFirstName
    const lastName = isEmail(rawLastName) ? '' : rawLastName

    let user = await this.userRepository.findByProviderId(providerId)
    if (!user) {
      user = await this.userRepository.findByEmail(email)
    }

    if (user) {
      const isShadow = user.passwordHash === PASS_PLACEHOLDERS.INVITED ||
        user.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
        !!(user.passwordHash && !user.passwordHash.startsWith('$2') && user.passwordHash !== PASS_PLACEHOLDERS.SOCIAL)

      if (isShadow) {
        throw new ForbiddenException({
          message: 'Your account was invited by a property manager. Complete your profile to login.',
          code: 'INVITE_PENDING',
          userId: user.uuid,
        })
      }

      const updates: Partial<User> = {}
      if (!user.providerId) updates.providerId = providerId

      // Only update first name if current is empty or looks like an email,
      // and the Google name is valid (non-empty & not an email)
      const currentFirstEmptyOrEmail = !user.firstName?.trim() || isEmail(user.firstName)
      const newFirstValid = firstName.trim() !== '' && !isEmail(firstName)
      if (currentFirstEmptyOrEmail && newFirstValid) {
        updates.firstName = firstName
      }

      // Only update last name if current is empty or looks like an email,
      // and the Google name is valid (non-empty & not an email)
      const currentLastEmptyOrEmail = !user.lastName?.trim() || isEmail(user.lastName)
      const newLastValid = lastName.trim() !== '' && !isEmail(lastName)
      if (currentLastEmptyOrEmail && newLastValid) {
        updates.lastName = lastName
      }

      if (user.passwordHash === PASS_PLACEHOLDERS.SOCIAL) {
        updates.authProvider = 'google'
      }

      if (Object.keys(updates).length > 0) {
        await this.userRepository.update(user.id!, updates)
        user = await this.userRepository.findByUuid(user.uuid)
      }
    } else {
      const waitlistEntry = await this.prisma.upward_waitlist.findFirst({
        where: {
          email,
          role: { not: 'OWNER' },
        },
      })

      const userData: Partial<User> = {
        uuid: crypto.randomUUID(),
        email,
        passwordHash: PASS_PLACEHOLDERS.SOCIAL,
        authProvider: 'google',
        providerId,
        firstName,
        lastName,
        isFromWaitlist: !!waitlistEntry,
        isFromInvite: false,
        profilePic: '',
      }

      await this.userRepository.save(userData as User)
      user = await this.userRepository.findByEmail(email)
      if (!user) throw new Error('Failed to create user after Google sign-in')
      await this.syncTenantStatuses(email)
    }

    if (!user) {
      throw new Error('Failed to resolve user after Google sign-in')
    }

    return this.generateFullAuthResponse(user)
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email)
  }

  async getWaitlistClaimData(uuid: string) {
    const entry = await this.prisma.upward_waitlist.findFirst({
      where: { 
        uuid,
        role: { not: 'OWNER' }
      }
    })
    
    if (!entry) {
      throw new ForbiddenException('Waitlist entry not found')
    }

    const existingUser = await this.userRepository.findByEmail(entry.email)
    
    return {
      success: true,
      email: entry.email,
      firstName: entry.firstName || '',
      lastName: entry.lastName || '',
      hasPassword: !!existingUser?.passwordHash && 
                   existingUser?.passwordHash !== PASS_PLACEHOLDERS.INVITED && 
                   existingUser?.passwordHash !== PASS_PLACEHOLDERS.SHADOW && 
                   existingUser?.passwordHash.startsWith('$2')
    }
  }

  async deleteWaitlistEntry(uuid: string) {
    await this.prisma.upward_waitlist.delete({
      where: { uuid }
    })
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
