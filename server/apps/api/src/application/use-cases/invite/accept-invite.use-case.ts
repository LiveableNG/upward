import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { USER_REPOSITORY, UserRepository, User } from '../../../domains/users/user.repository'
import { VERIFICATION_TOKEN_REPOSITORY, VerificationTokenRepository } from '../../../domains/auth/verification-token.repository'
import { UserAuthService } from '../../auth/user-auth.service'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { InitializeUserSequenceUseCase } from '../whatsapp-sequence/initialize-user-sequence.use-case'
import { InitializeEmailSequenceUseCase } from '../email-sequence/initialize-email-sequence.use-case'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface AcceptInviteDto {
  token: string
  password?: string
  otp?: string
  firstName?: string
  lastName?: string
  email?: string
}

export interface AcceptInviteResponse {
  success: boolean
  message: string
  accessToken: string
  refreshToken: string
  user: any
}

@Injectable()
export class AcceptInviteUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly userAuthService: UserAuthService,
    private readonly webhookService: WebhookService,
    private readonly initializeUserSequenceUseCase: InitializeUserSequenceUseCase,
    private readonly initializeEmailSequenceUseCase: InitializeEmailSequenceUseCase,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(dto: AcceptInviteDto): Promise<AcceptInviteResponse> {
    let userUuid: string | undefined
    const vt = await this.tokenRepository.findByToken(dto.token)

    if (vt && vt.context === 'INVITE' && vt.expiresAt >= new Date()) {
      userUuid = vt.identifier
    } else {
      const user = await this.userRepository.findByUuid(dto.token)
      if (user && user.passwordHash === 'INVITED') {
        userUuid = dto.token
      }
    }

    if (!userUuid) {
      throw new NotFoundException('Invite link is invalid or has expired')
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) throw new NotFoundException('Invite not found')

    if (!dto.password) {
      throw new BadRequestException('Password is required')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const oldEmailHash = user.emailHash
    const newEmail = dto.email || user.email
    const newEmailHash = this.encryption.hash(newEmail)

    await this.userRepository.update(user.id!, {
      passwordHash,
      firstName: dto.firstName || user.firstName,
      lastName: dto.lastName || user.lastName,
      email: newEmail,
      emailHash: newEmailHash,
      joinedAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: '2026-08-24',
    })

    if (dto.email && oldEmailHash && oldEmailHash !== newEmailHash) {
      await this.userRepository.updatePmTenantEmail(
        oldEmailHash,
        this.encryption.encrypt(newEmail),
        newEmailHash
      )
    }

    await this.userAuthService.syncTenantStatuses(newEmail)
    this.emailService
      .sendCustomerSupportNotification('USER', String(user.id))
      .catch((e) => console.error('Failed to send CS notification on invite accept', e))

    const updatedUser = await this.userRepository.findById(user.id!)
    if (!updatedUser) throw new Error('Failed to update user')

    if (vt) {
      await this.tokenRepository.delete(vt.id!)
    }

    const { accessToken, refreshToken, user: userNoPass } =
      await this.userAuthService.generateFullAuthResponse(updatedUser)

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

    // Trigger onboarding communication sequences
    try {
      const updated = updatedUser as any
      const isPhoneOnly = (updated.email || '').toLowerCase().endsWith('@upward.com')
      const hasPhone = !!updated.phone

      let pmName: string | undefined = undefined
      const companyUserItem = updated.companyUsers && updated.companyUsers.length > 0 ? updated.companyUsers[0] : null
      if (companyUserItem?.company?.name) {
        try {
          pmName = this.encryption.decrypt(companyUserItem.company.name)
        } catch {
          pmName = undefined
        }
      }

      if (!pmName && updated.properties && updated.properties.length > 0) {
        const prop = updated.properties[0]
        if (prop.manager) {
          const fn = prop.manager.firstName ? this.encryption.decrypt(prop.manager.firstName) : ''
          const ln = prop.manager.lastName ? this.encryption.decrypt(prop.manager.lastName) : ''
          pmName = `${fn} ${ln}`.trim() || undefined
        } else if (prop.company?.name) {
          try {
            pmName = this.encryption.decrypt(prop.company.name)
          } catch {
            pmName = undefined
          }
        }
      }

      if (hasPhone) {
        this.initializeUserSequenceUseCase
          .execute({
            userId: updated.id,
            firstName: updated.firstName,
            phoneEncrypted: updated.phone,
            phoneHash: updated.phoneHash || null,
            pmName,
          })
          .catch((e) => console.error('Failed to init WA sequence on invite accept', e))
      }

      if (!isPhoneOnly && !hasPhone) {
        this.initializeEmailSequenceUseCase
          .execute({
            userId: updated.id,
            email: updated.email,
          })
          .catch((e) => console.error('Failed to init Email sequence on invite accept', e))
      }

      this.userAuthService
        .sendWelcomeMessages(updatedUser, updatedUser.firstName, pmName)
        .catch((e) => console.error('Failed to send welcome messages on invite accept', e))
    } catch (e) {
      console.error('Error initializing sequences on invite accept', e)
    }

    return {
      success: true,
      message: 'Account activated successfully',
      accessToken,
      refreshToken,
      user: userNoPass,
    }
  }
}
