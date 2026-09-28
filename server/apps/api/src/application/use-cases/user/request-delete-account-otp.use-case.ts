import {
  Injectable,
  Inject,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import * as crypto from 'crypto'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import {
  VERIFICATION_TOKEN_REPOSITORY,
  VerificationTokenRepository,
} from '../../../domains/auth/verification-token.repository'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return email
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`
}

@Injectable()
export class RequestDeleteAccountOtpUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepository: VerificationTokenRepository,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(userUuid: string): Promise<{
    success: boolean
    emailMasked: string
    cooldownSeconds: number
  }> {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userUuid },
    })

    if (!user) {
      throw new NotFoundException('User account not found')
    }

    let email = user.email || ''
    try {
      email = this.encryption.decrypt(email)
    } catch {
      // Use raw if decryption fails
    }

    if (!email) {
      throw new NotFoundException('User email not found')
    }

    const context = 'DELETE_ACCOUNT'
    const existing = await this.tokenRepository.findByIdentifier(email, context)

    if (existing) {
      const now = Date.now()
      const createdAt = new Date(existing.createdAt).getTime()
      const elapsed = now - createdAt

      // 1. Enforce 60-second resend cooldown
      if (elapsed < 60000) {
        const remainingSeconds = Math.ceil((60000 - elapsed) / 1000)
        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting another verification code.`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      // 2. Enforce rate limit: max 3 requests within 15 minutes
      if (existing.resends >= 3 && elapsed < 15 * 60000) {
        throw new HttpException(
          'Too many deletion verification requests. Please try again after 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    const resendCount = existing ? (existing.resends || 0) + 1 : 0

    // 3. Delete any prior token
    await this.tokenRepository.deleteOldTokens(email, context)

    // 4. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // 5. Store token
    await this.tokenRepository.create({
      otp,
      context,
      identifier: email,
      resends: resendCount,
      metadata: { attempts: 0 },
      expiresAt,
    })

    // 6. Send OTP via Unified Communication Architecture
    await this.unifiedCommService.processCommunication({
      recipientEmail: email,
      recipientName: user.firstName,
      recipientRole: 'TENANT',
      type: 'AUTH_OTP',
      context: {
        otp,
        context,
        firstName: user.firstName,
        displayName: user.firstName,
        title: 'Confirm Account Deletion',
      },
    })

    return {
      success: true,
      emailMasked: maskEmail(email),
      cooldownSeconds: 60,
    }
  }
}
