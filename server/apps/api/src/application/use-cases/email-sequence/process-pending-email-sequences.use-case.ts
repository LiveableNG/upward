import { Injectable, Inject, Logger } from '@nestjs/common'
import {
  IEmailSequenceRepository,
  EMAIL_SEQUENCE_REPOSITORY,
} from '../../../domains/email-sequence/email-sequence.repository.interface'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class ProcessPendingEmailSequencesUseCase {
  private readonly logger = new Logger(ProcessPendingEmailSequencesUseCase.name)

  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
    private readonly emailService: EmailService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Checking for pending email sequences...')
    const now = new Date()
    
    const approvedLogs = await this.sequenceRepository.findLogsBeforeByStatus('APPROVED', now, 50)
    
    if (approvedLogs.length === 0) {
      this.logger.log('No approved email sequences to process.')
      return
    }

    this.logger.log(`Found ${approvedLogs.length} approved email sequences to process.`)

    for (const log of approvedLogs) {
      try {
        if (!log.user?.firstName || !log.email) {
          throw new Error('Missing user firstName or email')
        }

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
          this.logger.log(`Successfully sent email sequence ${log.stage} to ${log.email}`)
        } else {
          await this.sequenceRepository.updateStatus(log.id!, 'FAILED', 'Email service returned failure')
          this.logger.warn(`Failed to send email sequence ${log.stage} to ${log.email}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await this.sequenceRepository.updateStatus(log.id!, 'FAILED', errorMessage)
        this.logger.error(
          `Error processing email sequence log ${log.id}: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        )
      }
    }
  }
}
