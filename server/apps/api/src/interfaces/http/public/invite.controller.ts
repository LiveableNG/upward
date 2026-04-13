import { Controller, Get, Post, Param, Body, NotFoundException, BadRequestException, Res, HttpStatus, Inject } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UserAuthService } from '../../../application/auth/user-auth.service'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import * as bcrypt from 'bcrypt'

interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  status(code: number): FastifyReply
  send(payload: unknown): void
}

const REFRESH_COOKIE_NAME = 'user_refresh'
const ACCESS_COOKIE_NAME = 'access_token'

function setUserAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production'

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
    maxAge: 3600,
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
  ) { }

  @Get(':uuid')
  async getInviteData(@Param('uuid') uuid: string) {
    const user = await this.userRepository.findByUuid(uuid)

    if (!user) {
      throw new NotFoundException('Invite not found or expired')
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
      hasPassword,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || null,
      },
      company: companyUser ? {
        name: this.encryption.decrypt(companyUser.company.name),
        profilePic: (companyUser.company as any).profilePic,
      } : null,
      manager: managerName ? {
        name: managerName
      } : null,
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

  @Post(':uuid/accept')
  async acceptInvite(
    @Param('uuid') uuid: string,
    @Body() data: any,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const user = await this.userRepository.findByUuid(uuid)

    if (!user) {
      throw new NotFoundException('Invite not found')
    }

    if (!data.password) {
      throw new BadRequestException('Password is required')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    await this.userRepository.update(user.id!, {
      passwordHash,
      firstName: data.firstName || user.firstName,
      lastName: data.lastName || user.lastName,
      phone: data.phone || user.phone,
    })

    const updatedUser = await this.userRepository.findById(user.id!)
    if (!updatedUser) throw new Error('Failed to update user')

    // Generate tokens and create a database session
    const { accessToken, refreshToken, user: userNoPass } = await this.userAuthService.generateFullAuthResponse(updatedUser)
    
    setUserAuthCookies(reply, accessToken, refreshToken)

    const companyUser = user.companyUsers?.[0]
    const platformId = companyUser?.company?.platformId

    if (platformId) {
      await this.webhookService.sendWebhook(platformId, 'invite.accepted', {
        event: 'invite.accepted',
        data: {
          userUuid: updatedUser.uuid,
          customerEmail: updatedUser.email,
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          registeredAt: updatedUser.updatedAt,
        }
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
