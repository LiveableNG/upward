import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import {
  VERIFICATION_TOKEN_REPOSITORY,
  VerificationTokenRepository,
} from '../../../domains/auth/verification-token.repository'

export interface DeleteUserAccountDto {
  userUuid: string
  otp: string
  reason?: string
}

@Injectable()
export class DeleteUserAccountUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepository: VerificationTokenRepository,
  ) {}

  async execute(dto: DeleteUserAccountDto): Promise<{ success: boolean; message: string }> {
    const { userUuid, otp, reason } = dto

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      throw new BadRequestException('A valid 6-digit verification code is required.')
    }

    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userUuid },
      include: {
        properties: {
          select: { id: true },
        },
      },
    })

    if (!user) {
      throw new NotFoundException('User account not found')
    }

    let email = user.email || ''
    try {
      email = this.encryption.decrypt(email)
    } catch {
      // Ignore decryption failure, use raw
    }

    const context = 'DELETE_ACCOUNT'
    const tokenRecord = await this.tokenRepository.findByIdentifier(email, context)

    if (!tokenRecord || !tokenRecord.otp || new Date(tokenRecord.expiresAt) < new Date()) {
      throw new BadRequestException('Invalid or expired verification code.')
    }

    const currentAttempts = Number((tokenRecord.metadata as any)?.attempts || 0)
    if (currentAttempts >= 5) {
      if (tokenRecord.id) {
        await this.tokenRepository.delete(tokenRecord.id)
      }
      throw new ForbiddenException(
        'Too many failed attempts. This verification code has been invalidated. Please request a new one.',
      )
    }

    if (tokenRecord.otp !== otp.trim()) {
      const updatedAttempts = currentAttempts + 1
      if (updatedAttempts >= 5) {
        if (tokenRecord.id) {
          await this.tokenRepository.delete(tokenRecord.id)
        }
        throw new ForbiddenException(
          'Too many failed attempts. This verification code has been invalidated. Please request a new one.',
        )
      }

      if (tokenRecord.id) {
        await this.tokenRepository.update(tokenRecord.id, {
          metadata: {
            ...((tokenRecord.metadata as Record<string, unknown>) || {}),
            attempts: updatedAttempts,
          },
        })
      }

      const remainingAttempts = 5 - updatedAttempts
      throw new BadRequestException(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      )
    }

    const userPropertyIds = user.properties.map((p) => p.id)

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete dedicated virtual accounts to satisfy foreign key ON DELETE RESTRICT
      if (userPropertyIds.length > 0) {
        await tx.upward_dedicated_virtual_account.deleteMany({
          where: {
            userPropertyId: { in: userPropertyIds },
          },
        })
      }

      // 2. Delete WhatsApp transaction pins if any
      await tx.upward_whatsapp_transaction_pins.deleteMany({
        where: { upwardUserUuid: user.uuid },
      })

      // 3. Clear auth sessions
      await tx.upward_auth_session.deleteMany({
        where: { userId: user.id },
      })

      // 4. Clear push notification tokens
      await tx.upward_device_token.deleteMany({
        where: { userId: user.id },
      })

      // 5. Clear all verification tokens for this user
      await tx.upward_verification_token.deleteMany({
        where: {
          identifier: { in: [email, user.uuid] },
        },
      })

      // 6. Log in deletion audit
      await tx.upward_deletion_audit_log.create({
        data: {
          adminId: 'SELF',
          adminEmail: email || 'user-self-deletion',
          targetUserId: user.uuid,
          targetEmail: email,
          targetRole: 'USER',
          disabledAt: new Date(),
          daysDisabled: 0,
          reason: reason || 'User self-service account deletion (Apple Guideline 5.1.1(v))',
        },
      })

      // 7. Delete user record (cascades user properties, documents, transactions, bank details, etc.)
      await tx.upward_user.delete({
        where: { id: user.id },
      })
    })

    return {
      success: true,
      message: 'Account successfully deleted.',
    }
  }
}
