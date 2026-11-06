import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import {
  COMMERCE_REFUND_REPOSITORY,
  CommerceRefundRepository,
} from '../../../domains/commerce/commerce-refund.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domains/users/user.repository'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { CreateCommerceDisputeDto } from '../dto/commerce-dispute.dto'

@Injectable()
export class CreateCommerceDisputeUseCase {
  private readonly logger = new Logger(CreateCommerceDisputeUseCase.name)

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(COMMERCE_REFUND_REPOSITORY)
    private readonly refundRepo: CommerceRefundRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(userUuid: string, dto: CreateCommerceDisputeDto) {
    const user = await this.userRepo.findByUuid(userUuid)
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    const subOrder = await this.orderRepo.findSubOrderByUuid(dto.subOrderUuid)
    if (!subOrder) {
      throw new NotFoundException('Sub-order not found')
    }

    const order = subOrder.order || (await this.orderRepo.findOrderById(subOrder.orderId))
    if (!order || order.userId !== user.id) {
      throw new NotFoundException('Sub-order not found')
    }

    if (subOrder.customerStatus === 'DISPUTED') {
      throw new BadRequestException('A dispute is already open for this sub-order')
    }

    // Atomic domain operation in repository
    const dispute = await this.refundRepo.openDispute({
      subOrderId: subOrder.id!,
      orderId: order.id!,
      userId: user.id,
      reason: dto.reason.trim(),
      explanation: dto.explanation.trim(),
      evidenceUrls: dto.evidenceUrls || [],
    })

    // Multi-channel notifications
    // 1. In-app and push notification
    try {
      await this.notificationService.notifyUser(userId, {
        title: 'Complaint Logged With Concierge',
        message: `Your issue regarding sub-order ${subOrder.subOrderNumber} has been logged. Upward Support is reviewing it.`,
        type: 'SUPPORT',
        url: `/dashboard/lifestyle/orders/${order.uuid}`,
      })
    } catch (err) {
      this.logger.error(`Failed to dispatch in-app notification for dispute ${dispute.uuid}`, err)
    }

    // 2. Email confirmation to tenant
    try {
      const user = await this.userRepo.findById(userId)
      let tenantEmail: string | null = null
      if (user?.email) {
        tenantEmail = this.encryption.decrypt(user.email)
      }

      if (tenantEmail && !tenantEmail.endsWith('@upward.com')) {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B18; line-height: 1.5;">
            <div style="background-color: #B65B37; height: 6px; width: 100%;"></div>
            <div style="padding: 32px 24px; background-color: #FAF8F6; border-radius: 0 0 12px 12px; border: 1px solid #E5E2DC; border-top: none;">
              <h2 style="color: #B65B37; margin: 0 0 8px; font-size: 20px;">We Received Your Issue Report</h2>
              <p style="font-size: 14px; color: #666666; margin: 0 0 20px;">Your complaint for sub-order <strong>${subOrder.subOrderNumber}</strong> has been logged directly with the Upward Operations & Concierge desk.</p>
              
              <div style="background-color: #FFFFFF; border: 1px solid #E5E2DC; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #888888; margin-bottom: 4px;">Reason</div>
                <div style="font-size: 15px; font-weight: 700; color: #1E1B18; margin-bottom: 12px;">${dto.reason}</div>
                
                <div style="font-size: 12px; color: #888888; margin-bottom: 4px;">Details Provided</div>
                <div style="font-size: 13.5px; color: #444444;">${dto.explanation}</div>
              </div>

              <div style="background-color: #EBF8F2; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px; margin-bottom: 24px; font-size: 12.5px; color: #065F46;">
                <strong>Upward Buyer Protection Active:</strong> Vendor payout has been automatically placed on administrative hold pending resolution.
              </div>

              <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">Our concierge team will respond directly via email and push notification.</p>
            </div>
          </div>
        `

        await this.emailService.sendEmailWithRetry({
          email: tenantEmail,
          subject: `Complaint Received: Sub-Order ${subOrder.subOrderNumber} - Upward Support`,
          html,
          type: 'COMMERCE_DISPUTE_LOGGED',
        })
      }
    } catch (err) {
      this.logger.error(`Failed to send dispute confirmation email for dispute ${dispute.uuid}`, err)
    }

    return {
      message: 'Your inquiry/dispute has been logged. Upward Concierge is handling it directly.',
      dispute: {
        uuid: dispute.uuid,
        status: dispute.status,
        reason: dispute.reason,
        createdAt: dispute.createdAt,
      },
    }
  }
}
