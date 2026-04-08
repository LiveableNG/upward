import { Injectable, Logger, Inject, BadRequestException, NotFoundException } from '@nestjs/common'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '@domains/payments/payment.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '@domains/companies/property.repository'
import { USER_REPOSITORY, UserRepository } from '@domains/users/user.repository'
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '@domains/notifications/notification.repository'
import { SingleInviteUseCase, InviteRequest } from './single-invite.use-case'
import { randomUUID } from 'crypto'

export interface ExternalPaymentRequestPayload {
  userPropertyUuid?: string
  amount?: number
  currency?: string
  description?: string
  lineItems?: any
  dueDate: string
  invite?: InviteRequest
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

@Injectable()
export class CreateExternalPaymentRequestUseCase {
  private readonly logger = new Logger(CreateExternalPaymentRequestUseCase.name)

  constructor(
    private readonly singleInviteUseCase: SingleInviteUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(payload: ExternalPaymentRequestPayload, platformId: number): Promise<any> {
    let property: any

    if (payload.userPropertyUuid) {
      property = await this.propertyRepository.findByUuid(payload.userPropertyUuid)
      if (!property) {
        throw new NotFoundException(`Property with UUID ${payload.userPropertyUuid} not found`)
      }
    } else if (payload.invite) {
      const context = await this.singleInviteUseCase.setupInviteContext(payload.invite, platformId)
      property = context.property
    } else {
      throw new BadRequestException('Either userPropertyUuid or invite data must be provided')
    }

    const amount = payload.amount || property.rentAmount
    const currency = payload.currency || property.currency || 'NGN'

    const paymentRequest = await this.paymentRequestRepository.create({
      userId: property.userId,
      userPropertyId: property.id,
      amount: amount,
      currency: currency,
      description: payload.description,
      lineItems: payload.lineItems || undefined,
      dueDate: new Date(payload.dueDate),
      status: 'PENDING',
      reference: `EXT_${randomUUID()}_${Date.now()}`,
    })

    const user = await this.userRepository.findById(property.userId)
    
    if (user && user.passwordHash !== 'INVITED') {
      await this.notificationRepository.createNotification({
        userId: user.id!,
        title: 'New Payment Request',
        message: `You have a new payment request for ${paymentRequest.currency} ${paymentRequest.amount.toLocaleString()}. Description: ${paymentRequest.description || 'N/A'}`,
        type: 'PAYMENT'
      })
    }

    return {
      success: true,
      data: {
        paymentUuid: paymentRequest.uuid,
        paymentLink: `${FRONTEND_URL}/pay/${paymentRequest.uuid}`
      }
    }
  }
}
