import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import {
  ReceiptService,
  ReceiptPdfData,
} from '../../../shared/infrastructure/common/receipt/receipt.service'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentUpdatedEvent } from '../../events/definition/payment-updated.event'
import {
  ISavedLandlordRepository,
  ITransactionRepository,
  SAVED_LANDLORD_REPOSITORY,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  PAYMENT_REQUEST_REPOSITORY,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentGateway,
  IPaymentRequestRepository,
  IPaymentLineItemRepository,
  SavedLandlord,
  Transaction,
  SUBACCOUNT_REPOSITORY,
  ISubaccountRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { VerifyGatewayTransactionUseCase } from './verify-transaction.use-case'
import { DistributePaymentAllocationsUseCase } from './distribute-allocations.use-case'
import { SyncPmPaymentStatusUseCase } from './sync-pm-status.use-case'
import { SettlePropertyBalanceUseCase } from './settle-property.use-case'
import { HandlePaymentOverpaymentUseCase } from './handle-overpayment.use-case'


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
    let dueDate = new Date()

    if (data.propertyUuid) {
      const prop = await this.propertyRepo.findByUuid(data.propertyUuid)
      if (prop) {
        userPropertyId = prop.id
        if (prop.rentEndDate) {
          dueDate = prop.rentEndDate
        }
      }
    }

    const paymentRequest = await this.paymentRequestRepo.create({
      userId: user.id!,
      amount: data.amount,
      currency: 'NGN',
      description: data.metadata?.narration || 'Self-initiated Payment',
      dueDate,
      status: 'PENDING',
      allowPartial: true,
      subaccountId: subaccountId,
      userPropertyId,
      isManual: true,
      reference: `MNL_${Date.now()}`,
      rentStartDate: data.metadata?.rentStartDate ? new Date(data.metadata.rentStartDate) : undefined,
      rentEndDate: data.metadata?.rentEndDate ? new Date(data.metadata.rentEndDate) : undefined,
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

    return {
      uuid: paymentRequest.uuid,
    }
  }
}

@Injectable()

export class SaveLandlordUseCase {
  constructor(
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) { }

  async execute(data: Omit<SavedLandlord, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & { userId: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    const subaccount = await this.paymentGateway.findOrCreateSubaccount({
      businessName: data.name,
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
    })

    return this.landlordRepo.create({
      ...data,
      userId: user.id!,
      subaccountId: subaccount?.id,
    })
  }
}

@Injectable()
export class GetSavedLandlordsUseCase {
  constructor(
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) { }

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')
    return this.landlordRepo.findByUserId(user.id!)
  }
}

export interface LineItemPayment {
  id: number
  amountPaid: number
  name?: string
}

@Injectable()
export class RecordTransactionUseCase {
  private readonly logger = new Logger(RecordTransactionUseCase.name)

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly verifyTransaction: VerifyGatewayTransactionUseCase,
    private readonly distributeAllocations: DistributePaymentAllocationsUseCase,
    private readonly syncPmStatus: SyncPmPaymentStatusUseCase,
    private readonly settleProperty: SettlePropertyBalanceUseCase,
    private readonly handleOverpayment: HandlePaymentOverpaymentUseCase,
  ) { }

  async execute(
    data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & {
      userId: string
      userPropertyUuid?: string
      lineItemPayments?: LineItemPayment[]
      futureCreditName?: string
      lineItems?: any[]
    }
  ) {
    this.logger.log(`Recording transaction for reference: ${data.reference}`)

    const verification = await this.verifyTransaction.execute({
      userId: data.userId,
      reference: data.reference,
    })

    if (!verification.isNew && verification.existing) {
      return verification.existing
    }

    const { isVerified, verifiedAmount, user } = verification
    if (isVerified && verifiedAmount !== undefined) {
      data.amount = verifiedAmount
    }

    return await this.prisma.$transaction(async (txClient) => {
      let pr: any = null
      let excess = 0
      let remaining = 0
      let rentPortion = 0

      if (isVerified && data.type === 'RENT' && !data.paymentRequestId && data.userPropertyUuid) {
        const prop = await txClient.upward_user_property.findUnique({ where: { uuid: data.userPropertyUuid } })
        if (prop) {
          const matchingPRs = await txClient.upward_payment_request.findMany({
            where: { userId: user.id, userPropertyId: prop.id, status: { in: ['PENDING', 'PARTIAL'] } }
          })
          if (matchingPRs.length > 0) {
            data.paymentRequestId = matchingPRs[0]?.id
          }
        }
      }

      if (isVerified && data.paymentRequestId) {
        pr = await this.paymentRequestRepo.findById(data.paymentRequestId, txClient)
        if (pr) {
          const prItems = await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } })
          const rentRemaining = prItems.reduce((sum, item) => {
            if (item.name === 'Processing Fee') return sum
            return sum + Math.max(0, item.totalAmount - item.amountPaid)
          }, 0)
          remaining = rentRemaining
        }
      }

      let upwardFeeAmount = 0
      if (data.lineItemPayments && Array.isArray(data.lineItemPayments)) {
        const fee = data.lineItemPayments.find(lp => lp.name === 'Processing Fee')
        if (fee) upwardFeeAmount = Number(fee.amountPaid || 0)
      }

      if (upwardFeeAmount === 0 && pr) {
        const feeItem = (await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } }))
          .find(i => i.name === 'Processing Fee')
        if (feeItem) {
          upwardFeeAmount = Math.min(data.amount, feeItem.totalAmount - feeItem.amountPaid)
        }
      }

      const paymentAmount = pr ? Math.min(data.amount - upwardFeeAmount, remaining) + upwardFeeAmount : data.amount
      excess = pr ? Math.max(0, data.amount - upwardFeeAmount - remaining) : 0

      const result = await this.txRepo.create({
        ...data,
        userId: user.id!,
        amount: paymentAmount,
        status: isVerified ? 'SUCCESS' : 'FAILED',
        narration: data.narration || pr?.description || 'Property Payment',
        landlordId: data.landlordId || pr?.subaccount?.uuid || undefined,
      } as any, txClient)

      if (isVerified && result.status === 'SUCCESS') {
        if (pr) {
          const settlementPortion = Math.max(0, paymentAmount - upwardFeeAmount)
          const newAmountPaid = (pr.amountPaid || 0) + settlementPortion
          const prItems = await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } })
          const totalRentOwed = prItems.reduce((sum: number, i: any) => i.name === 'Processing Fee' ? sum : sum + i.totalAmount, 0)
          const newStatus = newAmountPaid >= totalRentOwed ? 'PAID' : 'PARTIAL'

          pr = await this.paymentRequestRepo.update(pr.id!, {
            amountPaid: Math.min(newAmountPaid, totalRentOwed),
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : undefined,
          }, txClient)
        }

        const distribution = await this.distributeAllocations.execute({
          transactionId: result.id,
          paymentRequestId: pr?.id,
          amount: paymentAmount,
          upwardFeeAmount,
          lineItemPayments: data.lineItemPayments,
          manualLineItems: data.lineItems,
          narration: result.narration,
          txClient
        })
        rentPortion = distribution.rentPortion
        result.lineItems = distribution.allocatedItems

        if (pr) {
          await this.syncPmStatus.execute({
            paymentRequestId: pr.id,
            rentPortion,
            txClient
          })
        }

        let propertyId = pr?.userPropertyId
        if (!propertyId && data.userPropertyUuid) {
          const p = await txClient.upward_user_property.findUnique({ where: { uuid: data.userPropertyUuid } })
          propertyId = p?.id
        }

        if (propertyId) {
          await this.settleProperty.execute({
            userId: user.id!,
            propertyId,
            rentPortion,
            paymentRequestId: pr?.id,
            dueDate: pr?.dueDate,
            rentEndDate: pr?.rentEndDate,
            rentType: pr?.rentType,
            currency: data.currency,
            description: result.narration,
            txClient
          })

          if (rentPortion > 0) {
             const prop = await txClient.upward_user_property.findUnique({ where: { id: propertyId } })
             if (prop && prop.amountRemaining === 0) {
                await txClient.upward_notification.create({
                  data: {
                    userId: user.id!,
                    title: 'Credit Score Boost!',
                    message: `Congratulations! Your full rent payment for ${data.propertyAddress || 'your property'} has boosted your credit health.`,
                    type: 'SYSTEM'
                  }
                })
             }
          }
        }

        await this.handleOverpayment.execute({
          userId: user.id!,
          excess,
          reference: data.reference,
          currency: data.currency || 'NGN',
          paymentRequestId: pr?.id,
          propertyAddress: data.propertyAddress,
          futureCreditName: data.futureCreditName,
          parentTransactionId: result.id,
          txClient
        })

        if (pr?.platformId && rentPortion > 0) {
          await this.publishWebhookEvent(pr, result, rentPortion, excess, user, txClient)
        }
      }

      return result
    }, { timeout: 20000 })
  }

  private async publishWebhookEvent(pr: any, result: any, rentPortion: number, excess: number, user: any, txClient: any) {
    try {
      const currentItems = await txClient.upward_payment_line_item.findMany({ where: { paymentRequestId: pr.id } })
      const rentItems = currentItems.filter((i: any) => i.name.toLowerCase().includes('rent'))
      const totalRentPaid = rentItems.reduce((sum: number, i: any) => sum + i.amountPaid, 0)
      const totalRentAmount = rentItems.reduce((sum: number, i: any) => sum + i.totalAmount, 0)
      const statusForWebhook = totalRentPaid >= totalRentAmount ? 'PAID' : 'PARTIAL'

      this.eventBus.publish(new PaymentUpdatedEvent(pr.platformId, 'payment.updated', {
        paymentUuid: pr.uuid,
        reference: result.reference,
        amountPaid: rentPortion,
        totalPaid: totalRentPaid,
        remainingAmount: Math.max(0, totalRentAmount - totalRentPaid),
        overpaymentAmount: excess,
        currency: result.currency || pr.currency || 'NGN',
        status: statusForWebhook,
        paidAt: new Date(),
        customerEmail: user.email
      }))
    } catch (e: any) {
      this.logger.error(`Failed to publish payment success event: ${e.message}`)
    }
  }
}

@Injectable()
export class GetBanksUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) { }

  async execute() {
    return this.gateway.getBanks()
  }
}

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
  ) { }

  async execute(uuid: string) {
    return this.txRepo.findByUuid(uuid)
  }
}

@Injectable()
export class GetUserTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) { }

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')
    return this.txRepo.findByUserId(user.id!)
  }
}

@Injectable()
export class VerifyAccountUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) { }

  async execute(accountNumber: string, bankCode: string) {
    return this.gateway.verifyAccountNumber(accountNumber, bankCode)
  }
}

@Injectable()
export class GenerateReceiptPdfUseCase {
  constructor(
    private readonly receiptService: ReceiptService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) { }

  async execute(data: ReceiptPdfData & { userPropertyId?: number; companyName?: string; managerName?: string }): Promise<string> {
    if (data.paidAt && typeof data.paidAt === 'string') {
      data.paidAt = new Date(data.paidAt)
    }

    if (data.userPropertyId && !data.landlordName) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { id: Number(data.userPropertyId) },
        include: {
          location: true,
          company: true,
          manager: true,
        }
      }) as any

      if (prop) {
        // Concatenated location string
        const loc = prop.location
        const addressParts = [
          loc?.address || loc?.area,
          loc?.state,
          loc?.country
        ].filter(Boolean)

        if (addressParts.length > 0) {
          data.propertyAddress = addressParts.join(', ')
        }

        // Resolve Recipient (Landlord Name)
        if (prop.company && prop.company.name !== 'account_name') {
          data.landlordName = prop.company.name
        } else if (prop.manager) {
          const first = prop.manager.firstName?.includes(':') ? this.encryption.decrypt(prop.manager.firstName) : prop.manager.firstName
          const last = prop.manager.lastName?.includes(':') ? this.encryption.decrypt(prop.manager.lastName) : prop.manager.lastName
          if (first !== 'account_name' && last !== 'account_name') {
            data.landlordName = `${first} ${last}`
          }
        }
      }
    }

    if (!data.landlordName || data.landlordName.toLowerCase().includes('rent payment') || data.landlordName === 'account_name') {
      if (data.companyName && data.companyName !== 'account_name') data.landlordName = data.companyName
      else if (data.managerName && data.managerName !== 'account_name') data.landlordName = data.managerName
      else data.landlordName = 'Property Manager'
    }

    if (!data.propertyAddress || data.propertyAddress.toLowerCase().includes('upward')) {
      if (data.propertyName) data.propertyAddress = data.propertyName
    }

    const buffer = await this.receiptService.generateReceiptPdf(data)

    const base64 = buffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
  }
}
@Injectable()
export class GetPendingPaymentsUseCase {
  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) { }

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    const pending = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING')
    const partial = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL')

    const payments = [...pending, ...partial]

    return Promise.all(payments.map(async (p: any) => {
      const lineItemRecords = await this.lineItemRepo.findByPaymentRequestId(p.id!)
      return {
        id: p.id,
        uuid: p.uuid,
        total_amount: p.amount,
        amountPaid: p.amountPaid || 0,
        currency: p.currency,
        status: p.status,
        allowPartial: p.allowPartial,
        minAmount: p.minAmount,
        maxPartialAmount: p.minAmount ? Math.max(0, (p.amount - (p.amountPaid || 0)) - p.minAmount) : (p.amount - (p.amountPaid || 0)),
        remainingBalance: p.amount - (p.amountPaid || 0),
        payment_link_token: p.uuid,
        invoice_number: p.reference || p.uuid.slice(-8),
        description: p.description || 'Property Payment',
        subaccountCode: p.subaccount?.subaccountCode || null,
        company_name: p.companyName,
        manager_name: p.managerName,
        property_address: p.propertyLocation,
        userPropertyUuid: p.userPropertyUuid,
        isManual: p.isManual,
        lineItemRecords,
      }
    }))
  }
}

@Injectable()
export class ResolveSubaccountUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) { }

  async execute(accountNumber: string, bankCode: string, businessName?: string) {
    const subaccount = await this.gateway.findOrCreateSubaccount({
      accountNumber,
      bankCode,
      businessName: businessName || 'Property Payment',
    })
    return {
      subaccountCode: subaccount?.subaccountCode,
    }
  }
}

@Injectable()
export class GetPropertyBalanceUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
  ) { }

  async execute(propertyUuid: string) {
    const prop = await this.propertyRepo.findByUuid(propertyUuid)
    if (!prop) throw new Error('Property not found')

    const allPending = await this.paymentRequestRepo.findByUserIdAndStatus(prop.userId, 'PENDING')
    const allPartial = await this.paymentRequestRepo.findByUserIdAndStatus(prop.userId, 'PARTIAL')

    const propRequests = [...allPending, ...allPartial].filter((p: any) => p.userPropertyId === prop.id)
    const requestTotal = propRequests.reduce((sum: number, pr: any) => sum + pr.amount, 0)

    const totalOwed = prop.rentAmount || requestTotal || 0
    const amountPaid = prop.amountPaid || 0
    const remainingBalance = (prop.amountRemaining === 0 && amountPaid < totalOwed)
      ? Math.max(0, totalOwed - amountPaid)
      : (prop.amountRemaining ?? Math.max(0, totalOwed - amountPaid))

    return {
      propertyUuid: prop.uuid,
      address: [prop.location?.address, prop.location?.area, prop.location?.state, prop.location?.country].filter(Boolean).join(', '),
      rentAmount: totalOwed,
      totalOwed: totalOwed,
      amountPaid: amountPaid,
      remainingBalance: remainingBalance,
      currency: prop.currency || 'NGN',
      dueDate: prop.rentEndDate,
      hasActiveRequest: propRequests.length > 0
    }
  }
}
