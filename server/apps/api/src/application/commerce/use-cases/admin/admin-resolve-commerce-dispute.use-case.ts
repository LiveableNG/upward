import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  COMMERCE_REFUND_REPOSITORY,
  CommerceRefundRepository,
} from '../../../../domains/commerce/commerce-refund.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../../domains/users/user.repository'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../../shared/infrastructure/common/notification.service'
import { ResolveCommerceDisputeDto } from '../../dto/commerce-dispute.dto'

@Injectable()
export class AdminResolveCommerceDisputeUseCase {
  private readonly logger = new Logger(AdminResolveCommerceDisputeUseCase.name)

  constructor(
    @Inject(COMMERCE_REFUND_REPOSITORY)
    private readonly refundRepo: CommerceRefundRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(adminEmail: string, disputeUuid: string, dto: ResolveCommerceDisputeDto) {
    const dispute = await this.refundRepo.findDisputeByUuid(disputeUuid)
    if (!dispute) {
      throw new NotFoundException(`Dispute '${disputeUuid}' not found`)
    }

    if (dispute.status === 'CLOSED' || dispute.status.startsWith('RESOLVED')) {
      throw new BadRequestException('Dispute is already resolved')
    }

    // Atomic settlement through Domain Repository (DDD pattern - no Prisma in UseCase)
    const outcome = await this.refundRepo.resolveDisputeAndSettle({
      disputeId: dispute.id!,
      resolutionStatus: dto.resolutionStatus,
      resolutionNotes: dto.resolutionNotes.trim(),
      resolvedBy: adminEmail,
      refundAmountKobo: dto.refundAmountKobo ? BigInt(dto.refundAmountKobo) : undefined,
    })

    // Multi-channel notifications to the tenant
    try {
      await this.notificationService.notifyUser(outcome.recipientUserId, {
        title: 'Support Issue Update',
        message: `Your complaint regarding sub-order ${outcome.subOrderNumber} has been resolved (${dto.resolutionStatus.replace('_', ' ')}). Notes: ${dto.resolutionNotes}`,
        type: 'SUPPORT',
        url: `/dashboard/lifestyle/orders`,
      })
    } catch (err) {
      this.logger.error(`Failed to send resolution notification for dispute ${disputeUuid}`, err)
    }

    try {
      const user = await this.userRepo.findById(outcome.recipientUserId)
      let tenantEmail: string | null = null
      if (user?.email) {
        tenantEmail = this.encryption.decrypt(user.email)
      }

      if (tenantEmail && !tenantEmail.endsWith('@upward.com')) {
        const isRefund = dto.resolutionStatus === 'RESOLVED_REFUND'
        const titleText = isRefund
          ? 'Complaint Resolved — Refund Approved'
          : 'Complaint Resolved'
        const badgeColor = isRefund ? '#065F46' : '#B65B37'
        const badgeBg = isRefund ? '#EBF8F2' : '#F7ECE7'

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B18; line-height: 1.5;">
            <div style="background-color: #B65B37; height: 6px; width: 100%;"></div>
            <div style="padding: 32px 24px; background-color: #FAF8F6; border-radius: 0 0 12px 12px; border: 1px solid #E5E2DC; border-top: none;">
              <h2 style="color: #B65B37; margin: 0 0 8px; font-size: 20px;">${titleText}</h2>
              <p style="font-size: 14px; color: #666666; margin: 0 0 20px;">An Upward Support Specialist has reviewed and finalized your case for sub-order <strong>${outcome.subOrderNumber}</strong>.</p>
              
              <div style="background-color: #FFFFFF; border: 1px solid #E5E2DC; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background-color: ${badgeBg}; color: ${badgeColor}; margin-bottom: 12px;">
                  ${dto.resolutionStatus.replace('_', ' ')}
                </div>
                
                <div style="font-size: 12px; color: #888888; margin-bottom: 4px;">Resolution Notes</div>
                <div style="font-size: 13.5px; color: #333333; line-height: 1.6;">${dto.resolutionNotes}</div>
              </div>

              ${
                isRefund
                  ? `<div style="background-color: #EBF8F2; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12.5px; color: #065F46;">
                      <strong>Refund Processing:</strong> Your payment gateway refund has been approved and will reflect in your original funding account according to standard banking settlement schedules (typically 3-5 business days).
                     </div>`
                  : ''
              }

              <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">Thank you for your patience while we resolved this with our operations team.</p>
            </div>
          </div>
        `

        await this.emailService.sendEmailWithRetry({
          email: tenantEmail,
          subject: `${titleText}: Sub-Order ${outcome.subOrderNumber} - Upward Support`,
          html,
          type: 'COMMERCE_DISPUTE_RESOLVED',
        })
      }
    } catch (err) {
      this.logger.error(`Failed to send resolution email for dispute ${disputeUuid}`, err)
    }

    return {
      message: 'Dispute resolved successfully',
      dispute: {
        uuid: outcome.dispute.uuid,
        status: outcome.dispute.status,
        resolutionNotes: outcome.dispute.resolutionNotes,
        resolvedAt: outcome.dispute.resolvedAt,
        resolvedBy: outcome.dispute.resolvedBy,
      },
      refund: outcome.refund
        ? {
            uuid: outcome.refund.uuid,
            amountKobo: outcome.refund.amountKobo.toString(),
            status: outcome.refund.status,
          }
        : null,
    }
  }
}
