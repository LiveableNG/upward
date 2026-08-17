import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Subscription } from 'rxjs'
import { EVENT_BUS, EventBus } from '../domain-event'
import { UnderpaymentDetectedEvent } from '../definition/underpayment-detected.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class UnderpaymentNotificationHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UnderpaymentNotificationHandler.name)
  private subscription?: Subscription

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  onModuleInit() {
    this.subscription = this.eventBus.subscribe<UnderpaymentDetectedEvent>(
      'UnderpaymentDetectedEvent',
      async (event) => {
        try {
          this.logger.log(`Handling UnderpaymentDetectedEvent for transaction ref: ${event.reference}`)

          const userProperty = await this.prisma.upward_user_property.findUnique({
            where: { id: event.propertyId },
            include: {
              pmUnit: {
                include: {
                  property: true
                }
              },
              pm: true,
              user: true
            }
          })

          if (!userProperty) {
            this.logger.warn(`User property ${event.propertyId} not found for underpayment notification`)
            return
          }

          const pmId = userProperty.pmId || userProperty.pmUnit?.property?.pmId
          if (!pmId) {
            this.logger.log(`No PM linked to property ${event.propertyId}; skipping PM notification`)
            return
          }

          const tenantFirstName = userProperty.user?.firstName
            ? (userProperty.user.firstName.includes(':') ? this.encryption.decrypt(userProperty.user.firstName) : userProperty.user.firstName)
            : ''
          const tenantLastName = userProperty.user?.lastName
            ? (userProperty.user.lastName.includes(':') ? this.encryption.decrypt(userProperty.user.lastName) : userProperty.user.lastName)
            : ''
          const tenantName = `${tenantFirstName} ${tenantLastName}`.trim() || 'Tenant'

          const formattedPaid = `NGN ${event.amountPaid.toLocaleString()}`
          const formattedExpected = `NGN ${event.amountExpected.toLocaleString()}`

          // 1. Create PM in-app notification
          await this.prisma.upward_pm_notification.create({
            data: {
              pmId,
              title: 'Underpayment Review Required ⚠️',
              message: `${tenantName} made an underpayment of ${formattedPaid} (Expected: ${formattedExpected}). Please review to accept or refund.`,
              type: 'SYSTEM',
              isPopup: true,
              url: '/payments',
            }
          })

          // 2. Send email notification to PM
          const pm = await this.prisma.upward_property_manager.findUnique({
            where: { id: pmId }
          })

          if (pm?.email) {
            const pmEmail = pm.email.includes(':') ? this.encryption.decrypt(pm.email) : pm.email
            const pmFirstName = pm.firstName ? (pm.firstName.includes(':') ? this.encryption.decrypt(pm.firstName) : pm.firstName) : ''
            const pmLastName = pm.lastName ? (pm.lastName.includes(':') ? this.encryption.decrypt(pm.lastName) : pm.lastName) : ''
            const pmName = `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager'

            const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()

            await this.unifiedCommService.processCommunication({
              recipientEmail: pmEmail,
              recipientName: pmName,
              recipientRole: 'PM',
              pmUuid: pm.uuid,
              type: 'PAYMENT_REMINDER' as any,
              context: {
                displayName: pmName,
                pmName,
                amount: event.amountPaid,
                formattedAmount: formattedPaid,
                tenantName,
                reference: event.reference,
                description: `Underpayment Alert: ${tenantName} paid ${formattedPaid} instead of expected ${formattedExpected}.`,
                paymentLink: `${baseUrl}/portal/payments`,
                baseUrl,
              }
            }).catch(err => {
              this.logger.error(`Failed to send underpayment notification email to PM ${pmEmail}:`, err)
            })
          }
        } catch (error) {
          this.logger.error('Failed to handle UnderpaymentDetectedEvent:', error)
        }
      }
    )
  }

  onModuleDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}
