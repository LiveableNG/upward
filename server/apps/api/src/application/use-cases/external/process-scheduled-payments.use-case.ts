import { Inject, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { 
  PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY, IPaymentLineItemRepository
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../../domains/notifications/notification.repository'
import { ResolveDedicatedAccountUseCase } from '../payments/payment.use-cases'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentRequestCreatedEvent } from '../../events/definition/payment-request-created.event'
import { randomUUID } from 'crypto'

const frontendUrl = process.env['FRONTEND_URL'] || 'https://upward.goodtenants.io'

@Injectable()
export class ProcessScheduledExternalPaymentRequestsUseCase {
  private readonly logger = new Logger(ProcessScheduledExternalPaymentRequestsUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepository: IPaymentLineItemRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    private readonly webhookService: WebhookService,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  async execute(): Promise<string[]> {
    this.logger.log('Checking for scheduled external payment requests due for delivery...')
    const now = new Date()

    const scheduledRequests = await this.prisma.upward_payment_request.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now }
      },
      include: {
        userProperty: {
          include: {
            company: {
              include: {
                platform: true
              }
            }
          }
        },
        user: true,
        subaccount: true
      }
    })

    this.logger.log(`Found ${scheduledRequests.length} scheduled external requests to process.`)
    const processedUuids: string[] = []

    for (const pr of scheduledRequests) {
      try {
        const platformId = pr.userProperty?.company?.platform?.id || pr.userProperty?.company?.platformId
        if (!platformId) {
          this.logger.warn(`Skipping scheduled request ${pr.uuid} because no platformId is associated.`)
          continue
        }

        // 1. Activate payment request
        await this.paymentRequestRepository.update(pr.id, {
          status: 'PENDING'
        })

        // 2. Resolve DVA
        let dvaDetails: any = null
        try {
          const dva = await this.resolveDedicatedAccount.execute({
            userPropertyId: pr.userPropertyId!,
            tenantEmail: pr.user.email!,
            tenantName: `${pr.user.firstName} ${pr.user.lastName}`,
            tenantPhone: pr.user.phone ?? undefined,
            subaccountCode: pr.subaccount?.subaccountCode
          })
          if (dva) {
            dvaDetails = {
              accountNumber: dva.accountNumber,
              accountName: dva.accountName,
              bankName: dva.bankName,
              bankCode: dva.bankCode
            }
          }
        } catch (e: any) {
          this.logger.warn(`Failed to resolve DVA for scheduled request ${pr.uuid}: ${e.message}`)
        }

        // 3. Send Notification to Tenant
        if (pr.user && pr.user.passwordHash !== 'INVITED') {
          await this.notificationRepository.createNotification({
            userId: pr.userId,
            title: 'New Payment Request',
            message: `You have a new payment request for ${pr.currency} ${pr.amount.toLocaleString()}. Description: ${pr.description || 'N/A'}`,
            type: 'PAYMENT',
            url: `/pay/${pr.uuid}`
          })
        }

        // 4. Publish Domain Event
        this.eventBus.publish(new PaymentRequestCreatedEvent(
          pr.id,
          pr.uuid,
          pr.userId,
          pr.amount
        ))

        // 5. Fire Webhook to Platform
        const paymentLink = `${frontendUrl}/pay/${pr.uuid}`
        await this.webhookService.sendWebhook(platformId, 'payment_request.activated', {
          paymentUuid: pr.uuid,
          paymentLink,
          amount: pr.amount,
          currency: pr.currency,
          status: 'PENDING',
          dva: dvaDetails
        })

        // 6. Handle Recurrence
        if (pr.isRecurring && pr.recurrenceInterval) {
          const interval = pr.recurrenceInterval
          
          const advanceDate = (date: Date, intervalStr: string): Date => {
            const d = new Date(date)
            if (intervalStr === 'MONTHLY') d.setMonth(d.getMonth() + 1)
            else if (intervalStr === 'QUARTERLY') d.setMonth(d.getMonth() + 3)
            else if (intervalStr === 'YEARLY') d.setFullYear(d.getFullYear() + 1)
            return d
          }

          const nextScheduledAt = pr.scheduledAt ? advanceDate(pr.scheduledAt, interval) : advanceDate(new Date(), interval)
          const nextDueDate = advanceDate(pr.dueDate, interval)
          const nextRentStart = pr.rentStartDate ? advanceDate(pr.rentStartDate, interval) : undefined
          const nextRentEnd = pr.rentEndDate ? advanceDate(pr.rentEndDate, interval) : undefined

          const clonedPr = await this.paymentRequestRepository.create({
            userId: pr.userId,
            userPropertyId: pr.userPropertyId ?? undefined,
            amount: pr.amount,
            currency: pr.currency,
            description: pr.description ?? undefined,
            dueDate: nextDueDate,
            rentStartDate: nextRentStart,
            rentEndDate: nextRentEnd,
            status: 'SCHEDULED',
            reference: `EXT_${randomUUID()}_${Date.now()}`,
            subaccountId: pr.subaccountId ?? undefined,
            allowPartial: pr.allowPartial,
            minAmount: pr.minAmount ?? undefined,
            rentType: pr.rentType ?? undefined,
            scheduledAt: nextScheduledAt,
            isRecurring: true,
            recurrenceInterval: interval
          })

          // Clone line items if any
          const lineItems = await this.lineItemRepository.findByPaymentRequestId(pr.id)
          if (lineItems && lineItems.length > 0) {
            await this.lineItemRepository.bulkCreate(
              lineItems.map((item, idx) => ({
                paymentRequestId: clonedPr.id!,
                name: item.name,
                totalAmount: item.totalAmount,
                amountPaid: 0,
                status: 'PENDING',
                sortOrder: idx,
              }))
            )
          }

          this.logger.log(`Created recurring clone for external request ${pr.uuid} scheduled for ${nextScheduledAt}`)
        }

        processedUuids.push(pr.uuid)
      } catch (err: any) {
        this.logger.error(`Failed to activate scheduled external request ${pr.uuid}:`, err)
      }
    }

    return processedUuids
  }
}
