import { Controller, Get, Post, Param, Body, NotFoundException, BadRequestException, Res, HttpStatus, Inject } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UserAuthService } from '../../../application/auth/user-auth.service'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { VERIFICATION_TOKEN_REPOSITORY, VerificationTokenRepository } from '../../../domains/auth/verification-token.repository'
import * as bcrypt from 'bcrypt'

interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  status(code: number): FastifyReply
  send(payload: unknown): void
}

const REFRESH_COOKIE_NAME = 'user_refresh'
const ACCESS_COOKIE_NAME = 'pay_access_token'

function setUserAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']

  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  })

  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

@Controller('public/invite')
export class InviteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly userAuthService: UserAuthService,
    private readonly webhookService: WebhookService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
  ) { }

  @Get(':token')
  async getInviteData(@Param('token') token: string) {
    try {
      const waitlist = await this.userAuthService.getWaitlistClaimData(token)
      if ( waitlist ){
        return {
          isWaitlist: true,
        }
      }
    } catch (e) {
      // Ignore if waitlist entry is not found, proceed to normal invite checks
    }
    let userUuid: string | undefined;
    const vt = await this.tokenRepository.findByToken(token)

    if (vt && vt.context === 'INVITE' && vt.expiresAt >= new Date()) {
      userUuid = vt.identifier;
    } else {
      const user = await this.userRepository.findByUuid(token);
      if (user && user.passwordHash === 'INVITED') {
        userUuid = token;
      }
    }

    if (!userUuid) {
      throw new NotFoundException('Invite link is invalid or has expired')
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) {
      throw new NotFoundException('Invited user not found')
    }

    const hasPassword = !!user.passwordHash && user.passwordHash !== '' && user.passwordHash !== 'INVITED'
    const companyUser = user.companyUsers?.[0]
    const property = user.properties?.[0]

    let managerName = ''
    if (property?.manager) {
      managerName = `${property.manager.firstName ? this.encryption.decrypt(property.manager.firstName) : ''} ${property.manager.lastName ? this.encryption.decrypt(property.manager.lastName) : ''}`
    }

    return {
      success: true,
      isWaitlist: false,
      hasPassword,
      email: user.email,
      phone: user.phone,
      isPhoneOnly: user.email.endsWith('@upward.com'),
      firstName: user.firstName,
      lastName: user.lastName,
      company: companyUser ? {
        name: this.encryption.decrypt(companyUser.company.name),
        profilePic: (companyUser.company as any).profilePic,
      } : null,
      manager: managerName ? { name: managerName } : null,
      property: property ? {
        rentAmount: property.rentAmount,
        location: property.location ? {
          area: property.location.area,
          city: property.location.state,
          country: property.location.country
        } : null
      } : null
    }
  }

  @Post(':token/request-otp')
  async requestInviteOTP(
    @Param('token') token: string,
    @Body() body: { email?: string }
  ) {
    const vt = await this.tokenRepository.findByToken(token)
    if (!vt || vt.context !== 'INVITE' || vt.expiresAt < new Date()) {
      throw new NotFoundException('Invite link is invalid or has expired')
    }

    let email = body.email
    if (!email) {
      const user = await this.userRepository.findByUuid(vt.identifier)
      if (!user) throw new NotFoundException('Invited user not found')
      email = user.email
    } else {
      // "This isn't my email" flow -> update user email server-side first
      const user = await this.userRepository.findByUuid(vt.identifier)
      if (!user) throw new NotFoundException('Invited user not found')
      
      await this.userRepository.update(user.id!, { 
        email: email,
        emailHash: (this.userRepository as any).encryption.hash(email)
      })
    }

    if (!email) {
      throw new BadRequestException('No email address found for this invite')
    }

    await this.userAuthService.requestOTP(email, 'INVITE')
    return { success: true, message: 'Verification code sent to ' + email }
  }

  @Post(':token/verify-otp')
  async verifyInviteOTP(
    @Param('token') token: string,
    @Body() body: { otp: string }
  ) {
    const vt = await this.tokenRepository.findByToken(token)
    if (!vt || vt.context !== 'INVITE') throw new NotFoundException('Invalid link')

    const user = await this.userRepository.findByUuid(vt.identifier)
    if (!user) throw new NotFoundException('User not found')

    return this.userAuthService.verifyOTP(user.email, body.otp, 'INVITE', false)
  }

  @Post(':token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @Body() data: { password?: string; otp?: string; firstName?: string; lastName?: string; email?: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    let userUuid: string | undefined;
    const vt = await this.tokenRepository.findByToken(token)

    if (vt && vt.context === 'INVITE' && vt.expiresAt >= new Date()) {
      userUuid = vt.identifier;
    } else {
      const user = await this.userRepository.findByUuid(token);
      if (user && user.passwordHash === 'INVITED') {
        userUuid = token;
      }
    }

    if (!userUuid) {
      throw new NotFoundException('Invite link is invalid or has expired')
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new NotFoundException('Invite not found')

    if (!data.password) {
      throw new BadRequestException('Password is required')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    await this.userRepository.update(user.id!, {
      passwordHash,
      firstName: data.firstName || user.firstName,
      lastName: data.lastName || user.lastName,
      email: data.email || user.email,
    })
    await this.userAuthService.syncTenantStatuses(user.email)

    const updatedUser = await this.userRepository.findById(user.id!)
    if (!updatedUser) throw new Error('Failed to update user')

    // Delete the invite token if it was used
    if (vt) {
      await this.tokenRepository.delete(vt.id!)
    }

    const { accessToken, refreshToken, user: userNoPass } = await this.userAuthService.generateFullAuthResponse(updatedUser)
    
    setUserAuthCookies(reply, accessToken, refreshToken)

    const companyUser = updatedUser.companyUsers?.[0]
    const platformId = companyUser?.company?.platformId

    if (platformId) {
      await this.webhookService.sendWebhook(platformId, 'invite.accepted', {
        userUuid: updatedUser.uuid,
        customerEmail: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        registeredAt: updatedUser.updatedAt,
      })
    }

    reply.status(HttpStatus.OK).send({
      success: true,
      message: 'Account activated successfully',
      accessToken,
      user: userNoPass
    })
  }
}
