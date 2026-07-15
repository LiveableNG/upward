import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import {
  IEmailSequenceRepository,
  EMAIL_SEQUENCE_REPOSITORY,
} from '../../../domains/email-sequence/email-sequence.repository.interface'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface RetryEmailSequenceCommand {
  logId: number
}

@Injectable()
export class RetryEmailSequenceUseCase {
  private readonly logger = new Logger(RetryEmailSequenceUseCase.name)

  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(command: RetryEmailSequenceCommand): Promise<void> {
    const log = await this.sequenceRepository.findById(command.logId)

    if (!log) {
      throw new NotFoundException(`Email sequence log with id ${command.logId} not found`)
    }

    if (log.status !== 'FAILED') {
      throw new BadRequestException(`Can only retry failed sequences. Current status is ${log.status}`)
    }

    if (!log.user?.firstName || !log.email) {
      throw new BadRequestException('Cannot retry: Missing user firstName or email')
    }

    this.logger.log(`Retrying email sequence ${log.stage} for ${log.email}...`)

    let decryptedFirstName = log.user.firstName || '';
    if (log.user.firstName && log.user.firstName.includes(':')) {
      decryptedFirstName = this.encryptionService.decrypt(log.user.firstName);
    }

    const success = await this.emailService.sendOnboardingSequenceEmail({
      email: log.email,
      firstName: decryptedFirstName,
      stage: log.stage,
      userId: log.userId.toString(),
    })

    if (success) {
      await this.sequenceRepository.updateStatus(log.id!, 'SENT', undefined, new Date())
      this.logger.log(`Successfully retried email sequence ${log.stage} for ${log.email}`)
    } else {
      await this.sequenceRepository.updateStatus(log.id!, 'FAILED', 'Manual retry failed: Email service returned failure')
      throw new Error('Manual retry failed: Email service returned failure')
    }
  }
}
