import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { VERIFICATION_TOKEN_REPOSITORY, VerificationTokenRepository } from '../../../domains/auth/verification-token.repository'
import { UserAuthService } from '../../auth/user-auth.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class RequestInviteOTPUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly userAuthService: UserAuthService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(token: string, bodyEmail?: string): Promise<{ success: boolean; message: string }> {
    const vt = await this.tokenRepository.findByToken(token)
    if (!vt || vt.context !== 'INVITE' || vt.expiresAt < new Date()) {
      throw new NotFoundException('Invite link is invalid or has expired')
    }

    let email = bodyEmail
    if (!email) {
      const user = await this.userRepository.findByUuid(vt.identifier)
      if (!user) throw new NotFoundException('Invited user not found')
      email = user.email
    } else {
      const user = await this.userRepository.findByUuid(vt.identifier)
      if (!user) throw new NotFoundException('Invited user not found')

      await this.userRepository.update(user.id!, {
        email: email,
        emailHash: this.encryption.hash(email),
      })
    }

    if (!email) {
      throw new BadRequestException('No email address found for this invite')
    }

    await this.userAuthService.requestOTP(email, 'INVITE')
    return { success: true, message: 'Verification code sent to ' + email }
  }
}
