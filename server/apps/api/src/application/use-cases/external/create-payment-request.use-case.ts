import { Injectable, Logger, Inject, BadRequestException, NotFoundException } from '@nestjs/common'
import {
  PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository,
  PAYMENT_GATEWAY, IPaymentGateway,
  PAYMENT_LINE_ITEM_REPOSITORY, IPaymentLineItemRepository,
} from '../../../domains/payments/payment.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../../domains/notifications/notification.repository'
import { SingleInviteUseCase, InviteRequest } from './single-invite.use-case'
import { ResolveDedicatedAccountUseCase } from '../payments/payment.use-cases'
import { randomUUID } from 'crypto'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentRequestCreatedEvent } from '../../events/definition/payment-request-created.event'
import { PaymentRequestUpdatedEvent } from '../../events/definition/payment-request-updated.event'

import { ExternalPaymentRequestPayloadDto as ExternalPaymentRequestPayload } from './external-api.dto'

const frontendUrl = process.env['FRONTEND_URL']
const urls = frontendUrl
  ? frontendUrl.split(',').map((url) => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173']

@Injectable()
export class CreateExternalPaymentRequestUseCase {
  private readonly logger = new Logger(CreateExternalPaymentRequestUseCase.name)

  constructor(
    private readonly singleInviteUseCase: SingleInviteUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY) private readonly lineItemRepository: IPaymentLineItemRepository,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) { }

  async execute(payload: ExternalPaymentRequestPayload, platformId: number): Promise<any> {
    let property: any

    if (payload.userPropertyUuid) {
      property = await this.propertyRepository.findByUuid(payload.userPropertyUuid)
      if (!property) {
        throw new NotFoundException(`Property with UUID ${payload.userPropertyUuid} not found`)
      }
    } else if (payload.invite) {
      const context = await this.singleInviteUseCase.setupInviteContext(payload.invite as InviteRequest, platformId)
      property = context.properties[0]
    } else {
      throw new BadRequestException('Either userPropertyUuid or invite data must be provided')
    }

    const user = await this.userRepository.findById(property.userId)
    if (!user) {
      throw new NotFoundException(`User associated with property not found`)
    }

    let amount = payload.amount || property.rentAmount;
    const currency = payload.currency || property.currency || 'NGN';

    // Fallback for minAmount if partial payments are allowed
    if (payload.allowPartial && !payload.minAmount) {
      payload.minAmount = 5000; // Sensible default for partial payments
    }

    if (payload.minAmount && payload.allowPartial === false) {
      payload.minAmount = 0
    }

    if (payload.lineItems && payload.lineItems.length > 0) {
      const lineItemsTotal = payload.lineItems.reduce((sum, item) => sum + item.amount, 0)
      if (Math.abs(lineItemsTotal - amount) !== 0) {
        throw new BadRequestException(
          `The sum of line items (${lineItemsTotal}) must equal the total amount (${amount})`
        )
      }
    }

    let subaccountId: number | undefined = property.subaccountId || undefined

    if (payload.bankCode || payload.accountNumber) {
      if (!payload.bankCode || !payload.accountNumber) {
        throw new BadRequestException('Both bankCode and accountNumber must be provided together')
      }

      const businessName = property.company?.name ||
        (property.manager ? `${property.manager.firstName} ${property.manager.lastName}` : null)

      if (!businessName) {
        throw new BadRequestException('A company name or manager name is required to create a settlement subaccount')
      }

      const subaccount = await this.paymentGateway.findOrCreateSubaccount({
        businessName: businessName,
        bankCode: payload.bankCode,
        accountNumber: payload.accountNumber,
      })
      if (subaccount) {
        subaccountId = subaccount.id
      } else {
        this.logger.warn(`Subaccount resolution failed for ${payload.accountNumber}. Proceeding with existing property settlement if any.`)
      }
    }

    const isScheduled = payload.scheduledAt && new Date(payload.scheduledAt) > new Date();
    let paymentRequest: any = null;

    if (payload.paymentRequestId) {
      paymentRequest = await this.paymentRequestRepository.findById(payload.paymentRequestId);
    } else {
      const userPendingRequests = await this.paymentRequestRepository.findByUserIdAndStatus(property.userId, isScheduled ? 'SCHEDULED' : 'PENDING')
      paymentRequest = userPendingRequests.find(pr =>
        pr.userPropertyId === property.id &&
        pr.amount === amount &&
        new Date(pr.dueDate).getTime() === new Date(payload.dueDate).getTime()
      )
    }

    if (paymentRequest) {
      // Upsert: update existing pending request with new metadata/settings
      paymentRequest = await this.paymentRequestRepository.update(paymentRequest.id!, {
        description: payload.description,
        dueDate: new Date(payload.dueDate),
        rentStartDate: payload.rentStartDate ? new Date(payload.rentStartDate) : undefined,
        rentEndDate: payload.rentEndDate ? new Date(payload.rentEndDate) : undefined,
        allowPartial: payload.allowPartial ?? paymentRequest.allowPartial,
        minAmount: payload.minAmount !== undefined ? payload.minAmount : paymentRequest.minAmount,
        rentType: payload.rentType || paymentRequest.rentType,
        subaccountId: subaccountId,
        status: isScheduled ? 'SCHEDULED' : paymentRequest.status,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : paymentRequest.scheduledAt,
        isRecurring: payload.isRecurring !== undefined ? payload.isRecurring : paymentRequest.isRecurring,
        recurrenceInterval: payload.recurrenceInterval !== undefined ? payload.recurrenceInterval : paymentRequest.recurrenceInterval,
      })

      // Re-sync line items: delete old, recreate
      if (payload.lineItems && payload.lineItems.length > 0) {
        await this.lineItemRepository.deleteByPaymentRequestId(paymentRequest.id!)
        await this.lineItemRepository.bulkCreate(
          payload.lineItems.map((item, idx) => ({
            paymentRequestId: paymentRequest!.id!,
            name: item.name || payload.description || 'Invoice Item',
            totalAmount: item.amount,
            amountPaid: 0,
            status: 'PENDING',
            sortOrder: idx,
          }))
        )
      }
      this.logger.log(`Updated existing payment request: ${paymentRequest.uuid}`)
      
      if (!isScheduled) {
        this.eventBus.publish(new PaymentRequestUpdatedEvent(
          paymentRequest.id,
          paymentRequest.uuid,
          paymentRequest.userId,
          paymentRequest.amount
        ))
      }
    } else {
      paymentRequest = await this.paymentRequestRepository.create({
        userId: property.userId,
        userPropertyId: property.id,
        amount: amount,
        currency: currency,
        description: payload.description,
        dueDate: new Date(payload.dueDate),
        rentStartDate: payload.rentStartDate ? new Date(payload.rentStartDate) : undefined,
        rentEndDate: payload.rentEndDate ? new Date(payload.rentEndDate) : undefined,
        status: isScheduled ? 'SCHEDULED' : 'PENDING',
        reference: `EXT_${randomUUID()}_${Date.now()}`,
        subaccountId: subaccountId,
        allowPartial: payload.allowPartial ?? false,
        minAmount: payload.minAmount || undefined,
        rentType: payload.rentType,
        scheduledAt: isScheduled ? new Date(payload.scheduledAt!) : undefined,
        isRecurring: isScheduled ? (payload.isRecurring || false) : false,
        recurrenceInterval: isScheduled && payload.isRecurring ? payload.recurrenceInterval : undefined,
      })

      // Create line item records
      if (payload.lineItems && payload.lineItems.length > 0) {
        await this.lineItemRepository.bulkCreate(
          payload.lineItems.map((item, idx) => ({
            paymentRequestId: paymentRequest!.id!,
            name: item.name || payload.description || 'Invoice Item',
            totalAmount: item.amount,
            amountPaid: 0,
            status: 'PENDING',
            sortOrder: idx,
          }))
        )
      }

      if (!isScheduled) {
        if (user && user.passwordHash !== 'INVITED') {
          await this.notificationRepository.createNotification({
            userId: user.id!,
            title: 'New Payment Request',
            message: `You have a new payment request for ${paymentRequest.currency} ${paymentRequest.amount.toLocaleString()}. Description: ${paymentRequest.description || 'N/A'}`,
            type: 'PAYMENT',
            url: `/pay/${paymentRequest.uuid}`
          })
        }
        this.eventBus.publish(new PaymentRequestCreatedEvent(
          paymentRequest.id,
          paymentRequest.uuid,
          paymentRequest.userId,
          paymentRequest.amount
        ))
      }
    }

    let dvaDetails: any = null
    if (!isScheduled) {
      try {
        const dva = await this.resolveDedicatedAccount.execute({
          userPropertyId: property.id,
          tenantEmail: user.email!,
          tenantName: `${user.firstName} ${user.lastName}`,
          tenantPhone: user.phone ?? undefined,
          subaccountCode: paymentRequest.subaccount?.subaccountCode
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
        this.logger.warn(`Failed to resolve DVA for property ${property.uuid}: ${e.message}`)
      }
    }

    return {
      paymentUuid: paymentRequest.uuid,
      paymentLink: isScheduled ? null : `${urls[0]}/pay/${paymentRequest.uuid}`,
      dva: dvaDetails,
      status: paymentRequest.status
    }
  }
}
