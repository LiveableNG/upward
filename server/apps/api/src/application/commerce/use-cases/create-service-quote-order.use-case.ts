import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { randomBytes } from 'crypto'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import {
  OFFERING_REPOSITORY,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domains/users/user.repository'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { SmsService } from '../../../shared/infrastructure/sms/sms.service'
import { CreateServiceQuoteOrderDto } from '../dto/service-quote.dto'
import {
  notifyAdminCommerceEvent,
  notifyCustomerCommerceMilestone,
} from '../utils/commerce-comms.helper'

@Injectable()
export class CreateServiceQuoteOrderUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly emailService?: EmailService,
    @Optional()
    private readonly smsService?: SmsService,
  ) {}

  async execute(params: {
    userUuid?: string
    userId?: number | string
    dto: CreateServiceQuoteOrderDto
  }) {
    const rawUser = params.userUuid ?? params.userId
    let user: any = null
    if (typeof rawUser === 'number') {
      user = await this.userRepo.findById(rawUser)
    } else if (rawUser) {
      user = await this.userRepo.findByUuid(rawUser)
    }
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    const { dto } = params
    let offering: any = null
    if (dto.offeringUuid) {
      offering = await this.offeringRepo.findOfferingByUuid(dto.offeringUuid)
    } else if (dto.offeringId) {
      offering = await this.offeringRepo.findOfferingById(dto.offeringId)
    }

    if (!offering) {
      throw new NotFoundException('Service offering not found')
    }

    if (offering.type !== 'SERVICE') {
      throw new BadRequestException('Custom quote requests are only supported for service offerings')
    }

    if (!offering.vendorId) {
      throw new BadRequestException('Service offering is missing a verified partner vendor')
    }

    const randSuffix = randomBytes(3).toString('hex').toUpperCase()
    const orderNumber = `UPW-SRV-${randSuffix}`
    const subOrderNumber = `${orderNumber}-V1`

    const recipientName =
      dto.recipientName?.trim() ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      'Upward Customer'
    const recipientPhone = dto.recipientPhone?.trim() || user.phone || 'Not provided'
    const deliveryAddress =
      dto.deliveryAddress?.trim() ||
      user.properties?.[0]?.address ||
      'To be confirmed during review'

    const primaryImage =
      offering.media?.find((m: any) => m.isPrimary)?.mediaUrl ||
      offering.media?.[0]?.mediaUrl ||
      offering.imageUrl ||
      null

    const order = await this.orderRepo.createServiceQuoteOrder({
      userId: user.id,
      orderNumber,
      subOrderNumber,
      currency: offering.currency || 'NGN',
      vendorId: offering.vendorId,
      offeringId: offering.id,
      offeringSnapshot: {
        title: offering.title || offering.name,
        subtitle: offering.subtitle || null,
        type: 'SERVICE',
        imageUrl: primaryImage,
        vendorName: offering.vendor?.name || 'Upward Partner',
        requestDetails: dto.requestDetails.trim(),
      },
      recipientName,
      recipientPhone,
      deliveryAddress,
      deliveryNotes: dto.requestDetails.trim(),
      deliveryZoneTag: dto.deliveryZoneTag,
      initialMessage: dto.requestDetails.trim(),
    })

    const serviceTitle = offering.title || offering.name || 'Service Request'

    // Notify Customer (Push + In-App + Email or SMS fallback)
    await notifyCustomerCommerceMilestone({
      notificationService: this.notificationService,
      emailService: this.emailService,
      smsService: this.smsService,
      userId: user.id,
      userEmail: user.email,
      userPhone: user.phone || recipientPhone,
      title: 'Service Request Received',
      message: `We received your request for "${serviceTitle}" (${orderNumber}). Our team will review your details and send your exact price shortly.`,
      emailSubject: `Service Request Received — ${serviceTitle} (${orderNumber})`,
      emailLines: [
        `Hi ${recipientName},`,
        `We've received your service request for <strong>${serviceTitle}</strong> (Order <strong>${orderNumber}</strong>).`,
        `<strong>Your Request Details:</strong><br/>${dto.requestDetails.trim()}`,
        `Our team is reviewing your request and may reach out in your order timeline if any clarification is needed before sending your exact price.`,
      ],
      smsText: `Upward: Your service request for ${serviceTitle} (${orderNumber}) has been received. We'll review and send your price shortly.`,
      url: `/dashboard/lifestyle/orders?uuid=${order.uuid}`,
      ctaLabel: 'Track Your Request',
      data: { orderUuid: order.uuid, orderNumber },
    })

    // Notify Admin
    await notifyAdminCommerceEvent({
      emailService: this.emailService,
      subject: `[NEW SERVICE QUOTE] ${serviceTitle} — ${orderNumber}`,
      title: `New Service Quote Request (${orderNumber})`,
      lines: [
        `<strong>Customer:</strong> ${recipientName} (${user.email || recipientPhone})`,
        `<strong>Service:</strong> ${serviceTitle}`,
        `<strong>Location / Zone:</strong> ${deliveryAddress}${dto.deliveryZoneTag ? ` (${dto.deliveryZoneTag})` : ''}`,
        `<strong>Request Details:</strong><br/>${dto.requestDetails.trim()}`,
        `Please review in the Admin Portal to ask follow-up questions or set the final quoted price.`,
      ],
    })

    return {
      order: {
        uuid: order.uuid,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmountKobo: order.totalAmountKobo.toString(),
        subOrders: order.subOrders?.map((s) => ({
          uuid: s.uuid,
          subOrderNumber: s.subOrderNumber,
          customerStatus: s.customerStatus,
        })),
      },
      message: 'Your quote request has been submitted!',
    }
  }
}
