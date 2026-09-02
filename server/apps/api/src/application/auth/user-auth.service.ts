import { Injectable, UnauthorizedException, ConflictException, Inject, ForbiddenException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository, USER_REPOSITORY, User, PASS_PLACEHOLDERS } from '../../domains/users/user.repository'
import { VerificationTokenRepository, VERIFICATION_TOKEN_REPOSITORY } from '../../domains/auth/verification-token.repository'
import { EmailService } from '../../shared/infrastructure/email/email.service'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { SmsService } from '../../shared/infrastructure/sms/sms.service'
import { S3Service } from '../../shared/infrastructure/common/s3/s3.service'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { UserAuthResponse } from '@upward/shared-types'
import { BaseAuthService } from './base-auth.service'
import { EncryptionService } from '../../shared/infrastructure/common/encryption.service'
import { WhatsappService } from '../../shared/infrastructure/whatsapp/whatsapp.service'
import { UnifiedCommunicationService } from '../../shared/infrastructure/communication/unified-communication.service'

import { InitializeUserSequenceUseCase } from '../use-cases/whatsapp-sequence/initialize-user-sequence.use-case'
import { InitializeEmailSequenceUseCase } from '../use-cases/email-sequence/initialize-email-sequence.use-case'

@Injectable()
export class UserAuthService extends BaseAuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
    private readonly encryption: EncryptionService,
    private readonly s3Service: S3Service,
    private readonly initializeUserSequenceUseCase: InitializeUserSequenceUseCase,
    private readonly initializeEmailSequenceUseCase: InitializeEmailSequenceUseCase,
    private readonly unifiedCommService: UnifiedCommunicationService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    super(jwtService, configService)
  }

  async generateFullAuthResponse(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
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

    // Resolve location
    let country: string | null = null
    let city: string | null = null
    if (ipAddress) {
      const geo = await lookupIp(ipAddress)
      country = geo.country
      city = geo.city
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
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        country,
        city,
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userNoPass } = user
    if (userNoPass.profilePic) {
      userNoPass.profilePic = await this.s3Service.getDownloadUrl(userNoPass.profilePic)
    }
    ;(userNoPass as any).verificationOn = process.env.VERIFICATION_ON !== 'false'
    return {
      accessToken,
      refreshToken,
      user: userNoPass as any,
    }
  }

  async signup(
    dto: {
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
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    if (dto.phone && !/^\+?\d{7,15}$/.test(dto.phone.replace(/[\s\-\(\)]/g, ''))) {
      throw new Error('Phone number must be a valid international phone number');
    }
    let existing = await this.userRepository.findByEmail(dto.email)

    if (!existing && dto.phone) {
      existing = await this.userRepository.findByPhone(dto.phone)
    }

    if (existing) {
      const isShadow = existing.passwordHash === PASS_PLACEHOLDERS.INVITED || 
                       existing.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
                       !!(existing.passwordHash && !existing.passwordHash.startsWith('$2'));

      if (isShadow || !existing.passwordHash) {
        const passwordHash = await bcrypt.hash(dto.password, 10)
        const oldEmailHash = existing.emailHash
        const newEmailHash = (this.userRepository as any).encryption.hash(dto.email)

        await this.userRepository.update(existing.id!, {
          passwordHash,
          email: dto.email,
          emailHash: newEmailHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
          firstNameHash: (this.userRepository as any).encryption.hash(dto.firstName),
          lastNameHash: (this.userRepository as any).encryption.hash(dto.lastName),
          phoneHash: dto.phone ? (this.userRepository as any).encryption.hash(dto.phone) : null,
        })

        if (oldEmailHash && oldEmailHash !== newEmailHash) {
          await this.prisma.upward_pm_tenant.updateMany({
            where: { emailHash: oldEmailHash },
            data: {
              emailEncrypted: (this.userRepository as any).encryption.encrypt(dto.email),
              emailHash: newEmailHash,
            }
          })
        }

        const user = await this.userRepository.findByEmail(dto.email)
        if (!user) throw new Error('Failed to update user after invite conversion')
        
        if (dto.properties && dto.properties.length > 0) {
          await this.syncProperties(user.id!, dto.properties)
        }
        await this.syncTenantStatuses(dto.email)
        this.emailService.sendCustomerSupportNotification('USER', String(user.id)).catch(e => console.error('Failed to send CS notification', e));
        
        let pmName: string | undefined = undefined;
        if (user.companyUsers && user.companyUsers.length > 0) {
          pmName = user.companyUsers[0].company?.name;
        }
        if (!pmName && user.properties && user.properties.length > 0) {
          const prop = user.properties[0];
          if (prop.company?.name) {
            pmName = prop.company.name;
          } else if (prop.manager) {
            pmName = `${prop.manager.firstName || ''} ${prop.manager.lastName || ''}`.trim() || undefined;
          }
        }

        // Channel eligibility:
        //   WhatsApp → user has a real phone number
        //   Email    → user has a real (non-@upward.com) email AND no phone
        const hasPhone_conv = !!user.phone;
        const isPhoneOnlyEmail_conv = user.email.toLowerCase().endsWith('@upward.com');

        if (hasPhone_conv) {
          this.initializeUserSequenceUseCase.execute({
            userId: user.id!,
            firstName: dto.firstName,
            phoneEncrypted: user.phone,
            phoneHash: user.phoneHash,
            pmName: pmName,
          }).catch(e => console.error('Failed to init WA sequence', e));
        }

        if (!isPhoneOnlyEmail_conv && !hasPhone_conv) {
          this.initializeEmailSequenceUseCase.execute({
            userId: user.id!,
            email: user.email,
          }).catch(e => console.error('Failed to init email sequence', e));
        }

        // Send welcome messages instantly
        this.sendWelcomeMessages(user, dto.firstName, pmName).catch(e => console.error('Failed to send welcome messages', e));

        return this.generateFullAuthResponse(user, ipAddress, userAgent)
      }
      throw new ConflictException('User with this email already exists')
    }

    if (dto.phone) {
      const existingPhone = await this.userRepository.findByPhone(dto.phone)
      if (existingPhone) {
        throw new ConflictException('User with this phone number already exists')
      }
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
    this.emailService.sendCustomerSupportNotification('USER', String(user.id)).catch(e => console.error('Failed to send CS notification', e));

    let pmName: string | undefined = undefined;
    if (user.companyUsers && user.companyUsers.length > 0) {
      pmName = user.companyUsers[0].company?.name;
    }
    if (!pmName && user.properties && user.properties.length > 0) {
      const prop = user.properties[0];
      if (prop.company?.name) {
        pmName = prop.company.name;
      } else if (prop.manager) {
        pmName = `${prop.manager.firstName || ''} ${prop.manager.lastName || ''}`.trim() || undefined;
      }
    }

    const isPhoneOnlyEmail = dto.email.toLowerCase().endsWith('@upward.com');
    const hasPhone = !!user.phone;
    const sendWhatsapp = hasPhone;
    const sendEmail = !isPhoneOnlyEmail && !hasPhone;

    if (sendWhatsapp && user.phone) {
      this.initializeUserSequenceUseCase.execute({
        userId: user.id!,
        firstName: dto.firstName,
        phoneEncrypted: user.phone,
        phoneHash: user.phoneHash,
        pmName: pmName,
      }).catch(e => console.error('Failed to init WA sequence', e));
    }

    if (sendEmail) {
      this.initializeEmailSequenceUseCase.execute({
        userId: user.id!,
        email: user.email,
      }).catch(e => console.error('Failed to init email sequence', e));
    }

    // Send welcome messages instantly
    this.sendWelcomeMessages(user, dto.firstName, pmName).catch(e => console.error('Failed to send welcome messages', e));

    return this.generateFullAuthResponse(user, ipAddress, userAgent)
  }

  async sendWelcomeMessages(user: User, firstName: string, pmName?: string) {
    const isPhoneOnlyEmail = user.email.toLowerCase().endsWith('@upward.com');
    const hasPhone = !!user.phone;
    const sendWhatsapp = hasPhone;
    const sendEmail = !isPhoneOnlyEmail && !hasPhone;

    if (sendEmail) {
      // 1. Send Welcome Email
      await this.unifiedCommService.processCommunication({
        recipientEmail: user.email,
        recipientName: firstName,
        recipientRole: 'TENANT',
        registeredUserId: user.id!,
        type: 'ONBOARDING_SEQUENCE_WELCOME',
        context: {
          firstName,
          stage: 'WELCOME',
        }
      });
    }

    // 2. Send Welcome WhatsApp
    if (sendWhatsapp && user.phone) {
      try {
        const parameters = [
          { type: 'text', text: firstName },
          { type: 'text', text: pmName || 'Upward' }
        ];

        await this.whatsappService.sendMessage({
          to: user.phone,
          template: {
            name: 'upward_seq_welcome_v2',
            components: [
              {
                type: 'body',
                parameters,
              }
            ],
          },
        });

        await this.prisma.upward_communication_log.create({
          data: {
            registeredUserId: user.id,
            subject: 'WhatsApp Sequence: WELCOME',
            status: 'SENT',
            channel: 'WHATSAPP',
            type: 'SEQUENCE',
            recipient: user.phone,
            body: 'Template: upward_seq_welcome_v2',
            sentAt: new Date(),
          }
        });
      } catch (error: any) {
        console.error(`Failed to send Welcome WhatsApp to ${user.id}: ${error.message}`);
      }
    }
  }

  async login(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
    type: 'email' | 'phone' = 'email'
  ): Promise<UserAuthResponse & { refreshToken: string }> {
    let user = null;
    if (type === 'phone') {
      user = await this.userRepository.findByPhone(identifier);
    } else {
      user = await this.userRepository.findByEmail(identifier);
    }

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

    return this.generateFullAuthResponse(user, ipAddress, userAgent)
  }

  async refreshAccessToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
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

    // Resolve location
    let country: string | null = null
    let city: string | null = null
    if (ipAddress) {
      const geo = await lookupIp(ipAddress)
      country = geo.country
      city = geo.city
    }

    // Rotate the token
    const newAccessToken = this.generateAccessToken({ sub: user.uuid, email: user.email })
    const newRefreshToken = this.generateRefreshToken({ sub: user.uuid, sid })
    
    await this.prisma.upward_auth_session.update({
      where: { id: sid },
      data: {
        refreshTokenHash: this.hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ipAddress || session.ipAddress,
        userAgent: userAgent || session.userAgent,
        country: country || session.country,
        city: city || session.city,
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

    if (data.phone && !/^\+?\d{7,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      throw new Error('Phone number must be a valid international phone number');
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
    await this.unifiedCommService.processCommunication({
      recipientEmail: user.email,
      recipientName: fullName,
      recipientRole: 'TENANT',
      registeredUserId: user.id,
      type: 'AUTH_OTP',
      context: {
        otp,
        title: 'Password Reset Request',
        greeting: fullName,
        message: 'We received a request to reset your password. Use the code below to proceed.',
        expiryText: 'This code expires in 15 minutes.',
      },
    });
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

  async verifyResetOTP(email: string, otp: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findByEmail(email)

    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    if (user.resetPasswordOTP !== otp || new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Invalid or expired verification code')
    }

    return { success: true }
  }

  async checkEmail(identifier: string, type: 'email' | 'phone' = 'email'): Promise<{ 
    exists: boolean; 
    hasPassword?: boolean; 
    isInvited?: boolean; 
    isWaitlist?: boolean;
    uuid?: string;
    authProvider?: string;
  }> {
    let user = null;
    if (type === 'phone') {
      user = await this.userRepository.findByPhone(identifier);
    } else {
      user = await this.userRepository.findByEmail(identifier)
    }
    
    if (!user) {
      const waitlistEntry = await this.prisma.upward_waitlist.findFirst({
        where: type === 'phone' ? { phone: identifier, role: { not: 'OWNER' } } : { email: identifier, role: { not: 'OWNER' } }
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

  async requestOTP(identifier: string, context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT' | 'WAITLIST', type: 'email' | 'phone' = 'email', channel: 'SMS' | 'WHATSAPP' = 'SMS'): Promise<{ context: string }> {
    let existing = null;
    if (type === 'phone') {
      existing = await this.userRepository.findByPhone(identifier);
    } else {
      existing = await this.userRepository.findByEmail(identifier)
    }

    let effectiveContext = context

    if (context === 'LOGIN' && !existing) {
      throw new UnauthorizedException('No account found with this identifier.')
    }

    if (context === 'WAITLIST') {
      const entry = await this.prisma.upward_waitlist.findFirst({
        where: type === 'phone' ? { phone: identifier, role: { not: 'OWNER' } } : { email: identifier, role: { not: 'OWNER' } }
      })
      if (!entry) throw new ForbiddenException('You are not on the priority waitlist.')
    }

    if (context === 'SIGNUP' && existing && existing.passwordHash && existing.passwordHash !== 'INVITED') {
      // Seamlessly switch to login flow
      effectiveContext = 'LOGIN'
    }

    // 1. Delete any old OTPs for this identifier/context
    await this.tokenRepository.deleteOldTokens(identifier, effectiveContext)

    // 2. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

    // 3. Create token record
    await this.tokenRepository.create({
      otp,
      context: effectiveContext as any,
      identifier: identifier,
      expiresAt,
    })

    // 4. Send via Unified Communication Architecture
    await this.unifiedCommService.processCommunication({
      recipientEmail: type === 'email' ? identifier : undefined,
      recipientPhone: type === 'phone' ? identifier : undefined,
      recipientRole: 'TENANT',
      type: 'AUTH_OTP',
      forceChannel: type === 'phone' ? (channel === 'WHATSAPP' ? 'WHATSAPP' : 'SMS') : 'EMAIL',
      context: {
        otp,
        context: effectiveContext,
        title: effectiveContext === 'SIGNUP' ? 'Verify your email' : 'Login Verification',
      },
    });
    return { context: effectiveContext }
  }

  async verifyOTP(identifier: string, otp: string, context: string, deleteOnSuccess = true, type: 'email' | 'phone' = 'email'): Promise<{ success: boolean; message?: string; inviteToken?: string; user?: any }> {
    const record = await this.tokenRepository.findByIdentifier(identifier, context)

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

    let user = null;
    if (type === 'phone') {
      user = await this.userRepository.findByPhone(identifier);
    } else {
      user = await this.userRepository.findByEmail(identifier);
    }

    if (context === 'INVITE') {
      if (user) {
        const inviteToken = crypto.randomUUID()
        await this.tokenRepository.create({
          uuid: crypto.randomUUID(),
          token: inviteToken,
          context: 'INVITE',
          identifier: user.uuid,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        })
        return { success: true, inviteToken, user }
      }
    }

    if (context === 'WAITLIST') {
      const entry = await this.prisma.upward_waitlist.findFirst({
        where: type === 'phone' ? { phone: identifier, role: { not: 'OWNER' } } : { email: identifier, role: { not: 'OWNER' } }
      })
      if (entry) {
        return { success: true, inviteToken: entry.uuid, user }
      }
    }

    return { success: true, user }
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

    const googleClientIdConfig = this.configService.get<string>('GOOGLE_CLIENT_ID')
    if (!googleClientIdConfig) {
      throw new BadRequestException('Google sign-in is not configured')
    }

    const allowedClientIds = googleClientIdConfig.split(',').map(id => id.trim())

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

    if (payload.error || !payload.aud || !allowedClientIds.includes(payload.aud)) {
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

      this.emailService.sendCustomerSupportNotification('USER', String(user.id)).catch(e => console.error('Failed to send CS notification', e));

      let pmName: string | undefined = undefined;
      if (user.companyUsers && user.companyUsers.length > 0) {
        pmName = user.companyUsers[0].company?.name;
      }
      if (!pmName && user.properties && user.properties.length > 0) {
        const prop = user.properties[0];
        if (prop.company?.name) {
          pmName = prop.company.name;
        } else if (prop.manager) {
          pmName = `${prop.manager.firstName || ''} ${prop.manager.lastName || ''}`.trim() || undefined;
        }
      }

      const isPhoneOnlyEmail = email.toLowerCase().endsWith('@upward.com');
      const hasPhone = !!user.phone;
      const sendWhatsapp = hasPhone;
      const sendEmail = !isPhoneOnlyEmail && !hasPhone;

      if (sendWhatsapp && user.phone) {
        this.initializeUserSequenceUseCase.execute({
          userId: user.id!,
          firstName: firstName,
          phoneEncrypted: user.phone,
          phoneHash: user.phoneHash,
          pmName: pmName,
        }).catch(e => console.error('Failed to init WA sequence', e));
      }

      if (sendEmail) {
        this.initializeEmailSequenceUseCase.execute({
          userId: user.id!,
          email: user.email,
        }).catch(e => console.error('Failed to init email sequence', e));
      }

      this.sendWelcomeMessages(user, firstName, pmName).catch(e => console.error('Failed to send welcome messages', e));
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

    let formattedPhone: string | undefined = undefined
    if (entry.phone) {
      let cleaned = entry.phone.trim().replace(/\s+/g, '')
      if (!cleaned.startsWith('+')) {
        if (cleaned.startsWith('0') && cleaned.length === 11) {
          cleaned = '+234' + cleaned.substring(1)
        } else if (cleaned.length === 10) {
          cleaned = '+234' + cleaned
        }
      }
      if (/^\+\d{7,15}$/.test(cleaned)) {
        formattedPhone = cleaned
      }
    }

    const existingUser = await this.userRepository.findByEmail(entry.email)

    return {
      success: true,
      email: entry.email,
      firstName: entry.firstName || '',
      lastName: entry.lastName || '',
      phone: formattedPhone,
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

async function lookupIp(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.')
  ) {
    return { country: 'Localhost', city: 'System' }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`)
      const res = (await response.json()) as any
      if (res && res.status === 'success') {
        return { country: res.country || null, city: res.city || null }
      }
    } catch (err: any) {
      // ignore
    }
  }
  return { country: null, city: null }
}
