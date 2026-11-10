import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IEmailSequenceRepository,
  EMAIL_SEQUENCE_REPOSITORY,
} from '../../../domains/email-sequence/email-sequence.repository.interface'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'

@Injectable()
export class ProcessPendingEmailSequencesUseCase {
  private readonly logger = new Logger(ProcessPendingEmailSequencesUseCase.name)

  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly notificationService: NotificationService,
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
        if (log.user?.isInternal) {
          await this.sequenceRepository.updateStatus(log.id!, 'FAILED', 'User is marked as internal')
          this.logger.warn(`Skipping email sequence ${log.stage} for user ${log.userId} — marked internal`)
          continue
        }
        if (!log.email || log.email.toLowerCase().endsWith('@upward.com')) {
          await this.sequenceRepository.updateStatus(log.id!, 'FAILED', 'Phone-only account — email sequence not applicable')
          this.logger.warn(`Skipping email sequence ${log.stage} for user ${log.userId} — @upward.com email`)
          continue
        }

        if (!log.user?.firstName || !log.email) {
          throw new Error('Missing user firstName or email')
        }

        let decryptedFirstName = log.user.firstName || '';
        if (log.user.firstName && log.user.firstName.includes(':')) {
          decryptedFirstName = this.encryptionService.decrypt(log.user.firstName);
        }

        const apiUrl = (this.configService.get<string>('API_URL') || '').replace(/\/$/, '')
        const res = await this.unifiedCommService.processCommunication({
          recipientEmail: log.email,
          recipientName: decryptedFirstName,
          recipientRole: 'TENANT',
          registeredUserId: log.userId,
          type: `ONBOARDING_SEQUENCE_${log.stage}` as any,
          context: {
            firstName: decryptedFirstName,
            stage: log.stage,
          },
          trackingPixelUrl: log.uuid ? `${apiUrl}/api/v1/email-tracking/open?t=${log.uuid}` : undefined,
          emailSequenceLogId: log.id,
        });

        const success = res;

        if (success) {
          await this.sequenceRepository.updateStatus(log.id!, 'SENT', undefined, new Date())
          this.logger.log(`Successfully sent email sequence ${log.stage} to ${log.email}`)

          // Pair with mobile push notification for high open rate
          const stagePrompts: Record<string, { title: string; message: string; url: string }> = {
            DAY_2: {
              title: 'Complete your Upward setup 🏠',
              message: `Hi ${decryptedFirstName || 'there'}, connect your apartment to start building your credit score on Upward.`,
              url: '/dashboard',
            },
            DAY_5: {
              title: 'Boost your credit with on-time rent 📈',
              message: 'Paying rent on time helps build your housing credibility. Tap to see how your score works.',
              url: '/dashboard',
            },
            DAY_9: {
              title: 'Unlock Upward Perks & Benefits 🎁',
              message: 'Explore lifestyle discounts and exclusive tenant rewards waiting in your dashboard.',
              url: '/dashboard/benefits',
            },
            DAY_14: {
              title: 'Keep your streak going 🚀',
              message: 'Check your upcoming rent schedule and make sure your payment details are ready.',
              url: '/dashboard/pay-rent',
            },
          }

          const prompt = stagePrompts[log.stage]
          if (prompt && log.userId) {
            this.notificationService
              .notifyUser(log.userId, {
                title: prompt.title,
                message: prompt.message,
                type: 'SYSTEM',
                url: prompt.url,
              })
              .catch((err) => {
                this.logger.warn(`Failed to dispatch sequence push notification: ${err?.message || err}`)
              })
          }
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
