import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentRequestCreatedEvent } from '../../events/definition/payment-request-created.event'
import {
  ISavedLandlordRepository,
  SAVED_LANDLORD_REPOSITORY,
  PAYMENT_GATEWAY,
  PAYMENT_REQUEST_REPOSITORY,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentGateway,
  IPaymentRequestRepository,
  IPaymentLineItemRepository,
  SUBACCOUNT_REPOSITORY,
  ISubaccountRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { RentalPeriodService } from '../../services/rental-period.service'

@Injectable()
export class CreateManualPaymentRequestUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
    @Inject(SUBACCOUNT_REPOSITORY)
    private readonly subaccountRepo: ISubaccountRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly rentalPeriodService: RentalPeriodService,
  ) { }

  async execute(data: {
    userId: string
    amount: number
    landlordUuid?: string
    landlordDetails?: {
      accountNumber: string
      bankCode: string
      name: string
    }
    propertyUuid?: string
    metadata?: any
  }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    let subaccountId: number | undefined

    if (data.landlordUuid) {
      const landlord = await this.landlordRepo.findByUuid(data.landlordUuid)
      if (landlord) {
        subaccountId = landlord.subaccountId
        if (!subaccountId) {
          const sub = await this.paymentGateway.findOrCreateSubaccount({
            accountNumber: landlord.accountNumber,
            bankCode: landlord.bankCode,
            businessName: landlord.name,
          })
          subaccountId = sub?.id
        }
      }
    } else if (data.landlordDetails) {
      const subaccount = await this.paymentGateway.findOrCreateSubaccount({
        businessName: data.landlordDetails.name,
        bankCode: data.landlordDetails.bankCode,
        accountNumber: data.landlordDetails.accountNumber,
      })
      subaccountId = subaccount?.id
    }

    if (!subaccountId && data.propertyUuid) {
      const prop = await this.propertyRepo.findByUuid(data.propertyUuid)
      if (prop && prop.subaccountId) {
        subaccountId = prop.subaccountId
      }
    }

    let userPropertyId: number | undefined
    let manualAccountId: number | undefined
    let dueDate = new Date()
    let rentStartDate: Date | undefined
    let rentEndDate: Date | undefined

    if (data.propertyUuid) {
      const prop = await this.propertyRepo.findByUuid(data.propertyUuid)
      if (prop) {
        userPropertyId = prop.id
        manualAccountId = prop.manualAccountId || (prop as any).pmUnit?.property?.manualAccountId || (prop as any).pm?.manualAccounts?.[0]?.id

        const activePr = await this.prisma.upward_payment_request.findFirst({
          where: {
            userPropertyId: prop.id,
            status: { in: ['PENDING', 'PARTIAL'] }
          }
        })
        const resolved = this.rentalPeriodService.resolveTargetRentalPeriod(
          {
            rentStartDate: prop.rentStartDate,
            rentEndDate: prop.rentEndDate,
            rentType: prop.rentType,
            leaseYears: (prop as any).leaseYears || (prop as any).pmUnit?.leaseYears || 1,
            amountRemaining: prop.amountRemaining,
            isFirstRent: prop.isFirstRent,
          },
          {
            rentStartDate: data.metadata?.rentStartDate,
            rentEndDate: data.metadata?.rentEndDate,
          }
        )
        rentStartDate = resolved.periodStart
        rentEndDate = resolved.periodEnd
        dueDate = resolved.dueDate
      }
    }

    const paymentRequest = await this.paymentRequestRepo.create({
      userId: user.id!,
      amount: data.amount,
      currency: 'NGN',
      description: data.metadata?.narration || data.metadata?.description || 'Manual Property Payment',
      dueDate,
      status: 'PENDING',
      allowPartial: true,
      subaccountId: subaccountId,
      manualAccountId: manualAccountId || data.metadata?.manualAccountId,
      userPropertyId,
      isManual: true,
      reference: `MNL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      rentStartDate,
      rentEndDate,
      rentType: data.metadata?.rentType,
      companyName: data.landlordDetails?.name || (data.landlordUuid ? (await this.landlordRepo.findByUuid(data.landlordUuid))?.name : undefined),
    })

    if (data.metadata?.lineItems && Array.isArray(data.metadata.lineItems)) {
      await this.lineItemRepo.bulkCreate(data.metadata.lineItems.map((li: any) => ({
        paymentRequestId: paymentRequest.id!,
        name: li.label || li.name,
        totalAmount: li.amount,
        amountPaid: 0,
        status: 'PENDING'
      })))
    }

    this.eventBus.publish(new PaymentRequestCreatedEvent(
      paymentRequest.id!,
      paymentRequest.uuid,
      paymentRequest.userId,
      paymentRequest.amount
    ))

    return {
      uuid: paymentRequest.uuid,
    }
  }
}
