import { Inject, Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { createHmac, randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import {
  ReceiptService,
  ReceiptPdfData,
} from '../../../shared/infrastructure/common/receipt/receipt.service'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentUpdatedEvent } from '../../events/definition/payment-updated.event'
import { PaymentSucceededEvent } from '../../events/definition/payment-succeeded.event'
import { UnderpaymentDetectedEvent } from '../../events/definition/underpayment-detected.event'
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
  DVA_ACCOUNT_REPOSITORY,
  IDVAAccountRepository,
  DVAAccount,
  OVERPAYMENT_REPOSITORY,
  IOverpaymentRepository,
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
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'

@Injectable()
export class GetBankDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: number) {
    return this.prisma.upward_user_bank_details.findUnique({
      where: { userId }
    });
  }
}

@Injectable()
export class SaveBankDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: number, data: any) {
    return this.prisma.upward_user_bank_details.upsert({
      where: { userId },
      create: {
        userId,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankCode: data.bankCode,
        bankName: data.bankName,
      },
      update: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankCode: data.bankCode,
        bankName: data.bankName,
      }
    });
  }
}


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
    @Inject(OVERPAYMENT_REPOSITORY)
    private readonly overpaymentRepo: IOverpaymentRepository,
    private readonly paymentConfig: PaymentConfigurationService,
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
    if (isVerified && !user) {
      this.logger.error(`Transaction verified but user not found for ID: ${data.userId}`)
      throw new UnauthorizedException('User context required to record transaction')
    }

    if (isVerified && verifiedAmount !== undefined) {
      data.amount = verifiedAmount
    }

    const appliedCredit = Number((data as any).metadata?.appliedCredit || 0)
    const effectiveAmount = data.amount + appliedCredit

    const { result, pr, rentPortion, excess, propertyId, paymentAmount } = await this.prisma.$transaction(async (txClient) => {
      let pr: any = null
      let excess = 0
      let remaining = effectiveAmount
      let rentPortion = 0
      let propertyId: number | undefined

      if (isVerified && data.type === 'RENT' && !data.paymentRequestId && data.userPropertyUuid) {
        const prop = await txClient.upward_user_property.findUnique({ where: { uuid: data.userPropertyUuid } })
        if (prop) {
          const matchingPRs = await txClient.upward_payment_request.findMany({
            where: { userId: user!.id, userPropertyId: prop.id, status: { in: ['PENDING', 'PARTIAL'] } }
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
          upwardFeeAmount = Math.min(effectiveAmount, feeItem.totalAmount - feeItem.amountPaid)
        }
      }

      const paymentAmount = pr ? Math.min(effectiveAmount - upwardFeeAmount, remaining) + upwardFeeAmount : effectiveAmount
      excess = pr ? Math.max(0, effectiveAmount - upwardFeeAmount - remaining) : 0

      const result = await this.txRepo.create({
        ...data,
        userId: user!.id!,
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

        propertyId = pr?.userPropertyId
        if (!propertyId && data.userPropertyUuid) {
          const p = await txClient.upward_user_property.findUnique({ where: { uuid: data.userPropertyUuid } })
          propertyId = p?.id
        }

        if (propertyId) {
          await this.settleProperty.execute({
            userId: user!.id!,
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
        }

        await this.handleOverpayment.execute({
          userId: user!.id!,
          excess,
          reference: data.reference,
          currency: data.currency || 'NGN',
          paymentRequestId: pr?.id,
          propertyAddress: data.propertyAddress,
          futureCreditName: data.futureCreditName,
          parentTransactionId: result.id,
          txClient
        })

        if (appliedCredit > 0) {
          let remainingToConsume = appliedCredit
          const overpayments = await this.overpaymentRepo.findByUserIdAndStatus(user!.id!, 'AVAILABLE', txClient)
          for (const op of overpayments) {
            if (remainingToConsume <= 0) break
            const toConsume = Math.min(op.amount, remainingToConsume)
            const newAmount = op.amount - toConsume
            await this.overpaymentRepo.update(op.id, {
              amount: newAmount,
              status: newAmount <= 0 ? 'USED' : 'AVAILABLE'
            }, txClient)
            remainingToConsume -= toConsume
          }
        }
      }

      return { result, pr, rentPortion, excess, propertyId, paymentAmount }
    }, { timeout: 20000 })

    if (isVerified && result.status === 'SUCCESS') {
      this.eventBus.publish(new PaymentSucceededEvent({
        transactionId: result.id,
        userId: user!.id!,
        propertyId: propertyId,
        amount: paymentAmount,
        rentPortion: rentPortion,
        paymentRequestId: pr?.id,
        paymentRequestUuid: pr?.uuid,
        reference: result.reference!,
        currency: result.currency || 'NGN',
        platformId: pr?.platformId,
        email: user!.email!,
        narration: result.narration || 'Property Payment',
        excess: excess,
      }))
    }

    return result
  }
}

@Injectable()
export class ResolveDedicatedAccountUseCase {
  private readonly logger = new Logger(ResolveDedicatedAccountUseCase.name)

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(DVA_ACCOUNT_REPOSITORY)
    private readonly dvaRepo: IDVAAccountRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) { }

  async execute(data: { userPropertyId: number; tenantEmail?: string; tenantName?: string; subaccountCode?: string }) {
    this.logger.log(`Resolving dedicated account for User Property ID: ${data.userPropertyId}`)
    
    const existing = await this.dvaRepo.findByUserPropertyId(data.userPropertyId)
    if (existing) {
      this.logger.log(`Using existing DVA for User Property ${data.userPropertyId}: ${existing.accountNumber}`)
      return existing
    }
    let finalSubaccountCode = data.subaccountCode
    if (!finalSubaccountCode) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { id: data.userPropertyId },
        include: { subaccount: true }
      })
      if (prop?.subaccount) {
        finalSubaccountCode = prop.subaccount.subaccountCode
        this.logger.log(`Auto-resolved subaccount ${finalSubaccountCode} for DVA creation`)
      }
    }

    const email = data.tenantEmail || `prop-${data.userPropertyId}@upward.ng`
    const firstName = data.tenantName?.split(' ')[0] || 'Tenant'
    const lastName = data.tenantName?.split(' ')[1] || `Property-${data.userPropertyId}`

    this.logger.log(`Creating customer for DVA: ${email}`)
    const customerCode = await this.gateway.createCustomer({ email, firstName, lastName })
    if (!customerCode) throw new Error('Failed to resolve customer for DVA')

    this.logger.log(`Requesting DVA creation from Paystack for customer ${customerCode}`)
    const res = await this.gateway.createDedicatedAccount({
      customerCode,      
      subaccountCode: undefined 
    })

    if (!res.status || !res.data) {
      throw new Error(res.message || 'Failed to create dedicated account')
    }

    const account = res.data

    this.logger.log(`DVA created successfully: ${account.account_number}. Saving to DB...`)
    return await this.dvaRepo.create({
      accountNumber: account.account_number,
      accountName: account.account_name,
      bankName: account.bank.name,
      bankCode: account.bank.slug || '',
      accountCode: account.dedicated_account_code || account.account_number,
      paystackCustomerId: customerCode,
      userPropertyId: data.userPropertyId,
      metadata: account
    })
  }
}

@Injectable()
export class InitializePaymentUseCase {
  private readonly logger = new Logger(InitializePaymentUseCase.name)

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(OVERPAYMENT_REPOSITORY)
    private readonly overpaymentRepo: IOverpaymentRepository,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly prisma: PrismaService,
  ) { }

  async execute(data: {
    userId: string
    amount: number
    paymentRequestUuid?: string
    metadata?: any
  }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    let pr: any = null
    if (data.paymentRequestUuid) {
      pr = await this.paymentRequestRepo.findByUuid(data.paymentRequestUuid)
      if (pr) {
        const remainingRent = pr.amount - (pr.amountPaid || 0)
        
        if (!pr.allowPartial && data.amount < remainingRent && data.amount > 0) {
          throw new BadRequestException(`Partial payments are not enabled for this request. Please pay the full balance of ₦${remainingRent}.`)
        }
        if (pr.allowPartial && pr.minAmount && data.amount < pr.minAmount && data.amount > 0) {
          throw new BadRequestException(`The minimum allowed partial payment for this request is ₦${pr.minAmount}.`)
        }
      }
    }

    const flatFee = this.paymentConfig.getProcessingFee()
    let userPropertyId = pr?.userPropertyId

    if (pr && !userPropertyId) {
      this.logger.log(`Attempting to recover userPropertyId for PR ${pr.uuid} from PM context`)
      const pmPR = await this.prisma.upward_pm_payment_request.findFirst({
        where: { paymentRequestId: pr.id },
        include: { unit: true }
      })

      if (pmPR?.unit?.userPropertyUuid) {
        const userProp = await this.prisma.upward_user_property.findUnique({
          where: { uuid: pmPR.unit.userPropertyUuid }
        })
        if (userProp) {
          userPropertyId = userProp.id
          this.logger.log(`Recovered userPropertyId ${userPropertyId} for PR ${pr.uuid}. Updating record.`)
          await this.paymentRequestRepo.update(pr.id, { userPropertyId })
        }
      }
    }

    if (userPropertyId) {
      const availableOverpayments = await this.overpaymentRepo.findByUserIdAndStatus(user.id!, 'AVAILABLE')
      const totalCredit = availableOverpayments.reduce((sum, o) => sum + o.amount, 0)
      
      const requestedTotal = (data.amount || pr.amount) + flatFee
      const appliedCredit = Math.min(totalCredit, requestedTotal)
      const finalAmountToPay = requestedTotal - appliedCredit

      const dva = await this.resolveDedicatedAccount.execute({
        userPropertyId: userPropertyId,
        tenantEmail: user.email!,
        tenantName: `${user.firstName} ${user.lastName}`,
        subaccountCode: pr.subaccount?.subaccountCode
      })

      return {
        type: 'DVA',
        amount: requestedTotal,
        appliedCredit,
        finalAmount: finalAmountToPay,
        fee: flatFee,
        dva: {
          accountNumber: dva.accountNumber,
          accountName: dva.accountName,
          bankName: dva.bankName,
          bankCode: dva.bankCode
        },
        reference: `DVA-${dva.accountNumber}-${Date.now()}`
      }
    }

    // Standard Payment or DVA Fallback
    const availableOverpayments = await this.overpaymentRepo.findByUserIdAndStatus(user.id!, 'AVAILABLE')
    const totalCredit = availableOverpayments.reduce((sum, o) => sum + o.amount, 0)
    
    const baseAmount = data.amount || pr?.amount || 0
    const requestedTotal = baseAmount + flatFee
    
    const appliedCredit = Math.min(totalCredit, requestedTotal)
    const finalAmountToPay = requestedTotal - appliedCredit

    if (finalAmountToPay <= 0) {
      return {
        type: 'CREDIT_ONLY',
        amount: requestedTotal,
        appliedCredit,
        finalAmount: 0,
        reference: `CREDIT-${user.id}-${Date.now()}`
      }
    }

    const metadata = {
      ...data.metadata,
      userId: user.id,
      userUuid: user.uuid,
      paymentRequestUuid: pr?.uuid,
      paymentRequestId: pr?.id,
      userPropertyUuid: pr?.userPropertyUuid,
      appliedCredit,
      description: data.metadata?.description || pr?.description || 'Property Payment'
    }

    const initialization = await this.gateway.initializeTransaction({
      email: user.email!,
      amount: Math.round(finalAmountToPay * 100), // Paystack expects kobo/cents
      reference: `PAY-${randomUUID()}`,
      subaccount: pr?.subaccount?.subaccountCode,
      metadata
    })

    return {
      type: 'PAYSTACK',
      ...initialization,
      appliedCredit,
      finalAmount: finalAmountToPay,
      fee: flatFee
    }
  }
}

@Injectable()
export class ProcessPaymentWebhookUseCase {
  private readonly logger = new Logger(ProcessPaymentWebhookUseCase.name)

  constructor(
    private readonly recordTransaction: RecordTransactionUseCase,
    private readonly configService: ConfigService,
    @Inject(DVA_ACCOUNT_REPOSITORY)
    private readonly dvaRepo: IDVAAccountRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly paymentConfig: PaymentConfigurationService,
  ) { }

  async execute(payload: any, signature?: string) {
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature')
    }

    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')
    if (!secret) {
      this.logger.error('PAYSTACK_SECRET_KEY not found in configuration')
      throw new Error('Internal configuration error')
    }

    // Verify HMAC SHA512 signature
    const hash = createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex')

    if (hash !== signature) {
      this.logger.warn(`Invalid webhook signature attempt. Expected: ${hash.slice(0, 8)}..., Received: ${signature.slice(0, 8)}...`)
      throw new UnauthorizedException('Invalid signature')
    }
    this.logger.log(`Processing Paystack Webhook: ${payload.event}`)

    // Handle Standard Charge Success
    if (payload.event === 'charge.success') {
      const { reference, metadata, amount, currency } = payload.data
      const { userUuid, userId } = metadata || {}

      if (!userUuid && !userId) {
        throw new Error('No user identification in Paystack metadata')
      }

      const effectiveUserId = userUuid || userId

      return this.recordTransaction.execute({
        userId: effectiveUserId,
        reference,
        amount: amount / 100,
        currency: currency || 'NGN',
        userPropertyUuid: metadata?.userPropertyUuid,
        paymentRequestId: metadata?.paymentRequestId,
        type: metadata?.type || 'RENT',
        status: 'SUCCESS',
        narration: metadata?.description || payload.data.display_text || 'Paystack Payment',
        lineItemPayments: metadata?.lineItems,
      })
    }

    if (payload.event === 'dedicatedaccount.payment.success') {
      const accountNumber = payload.data.dedicated_account.account_number
      this.logger.log(`DVA Payment detected for account: ${accountNumber}`)

      const dva = await this.dvaRepo.findByAccountNumber(accountNumber)
      if (!dva || !dva.userPropertyId) {
        this.logger.warn(`DVA payment received for unknown or unlinked account: ${accountNumber}`)
        return { success: true, message: 'Unlinked account' }
      }

      // Find active payment request for this user property
      const pr = await this.prisma.upward_payment_request.findFirst({
        where: {
          userPropertyId: dva.userPropertyId,
          status: { in: ['PENDING', 'PARTIAL'] }
        },
        include: { 
          user: true,
          userProperty: {
            include: { subaccount: true }
          }
        }
      })

      if (!pr) {
        this.logger.log(`Manual DVA payment received for Property ${dva.userPropertyId} with no active request. Recording as general payment.`)
        
        // Find the user associated with this property
        const userProp = await this.prisma.upward_user_property.findUnique({
          where: { id: dva.userPropertyId },
          include: { user: true, subaccount: true }
        })
        
        if (!userProp) {
          this.logger.error(`DVA payment received for non-existent property relation: ${dva.userPropertyId}`)
          return { success: true, message: 'Property not found' }
        }

        const result = await this.recordTransaction.execute({
          userId: userProp.user.uuid,
          amount: payload.data.amount / 100,
          currency: payload.data.currency,
          reference: payload.data.reference,
          type: 'RENT',
          status: 'SUCCESS',
          narration: `Manual Bank Transfer to ${dva.accountNumber}`,
          settlementStatus: 'VERIFIED'
        })

        return result
      }

      // 3. Verification Logic: Intercept & Check against Source of Truth
      const amountPaid = payload.data.amount / 100
      const expectedTotal = pr.amount + this.paymentConfig.getProcessingFee()
      
      let settlementStatus = 'VERIFIED'
      if (!pr.allowPartial && amountPaid < expectedTotal) {
        this.logger.warn(`Full-Payment Violation: User ${pr.user.email} paid ${amountPaid} instead of ${expectedTotal}. Marking for refund.`)
        settlementStatus = 'PENDING_REFUND'
      }

      // 4. Record Transaction with the determined settlement status
      const result = await this.recordTransaction.execute({
        userId: pr.user.uuid,
        amount: amountPaid,
        currency: payload.data.currency,
        reference: payload.data.reference,
        type: 'RENT',
        status: 'SUCCESS',
        paymentRequestId: pr.id,
        narration: `Bank Transfer to ${dva.accountNumber} (${dva.bankName})`,
        settlementStatus
      })

      // 5. Trigger Alerts if it's an underpayment
      if (settlementStatus === 'PENDING_REFUND') {
        this.eventBus.publish(new UnderpaymentDetectedEvent(
          pr.user.id,
          pr.userPropertyId!,
          pr.id,
          amountPaid,
          expectedTotal,
          payload.data.reference,
          true // It's a violation because it was Full-Only
        ))
      }

      return result
    }

    if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(payload.event)) {
      const { reference } = payload.data
      const isSuccess = payload.event === 'transfer.success'
      const status = isSuccess ? 'COMPLETED' : 'FAILED'

      this.logger.log(`Transfer ${payload.event} received for reference: ${reference}`)

      if (reference.startsWith('BATCH-')) {
        const batchUuid = reference.replace('BATCH-', '')
        const batch = await this.prisma.upward_settlement_batch.findUnique({ where: { uuid: batchUuid } })
        if (batch) {
          await this.prisma.upward_settlement_batch.update({
            where: { id: batch.id },
            data: { status }
          })
          if (!isSuccess) {
            await this.prisma.upward_transaction.updateMany({
              where: { settlementBatchId: batch.id },
              data: { settlementStatus: 'VERIFIED', settlementBatchId: null }
            })
          }
        }
      }

      if (reference.startsWith('REFUND-')) {
        const originalTxRef = reference.replace('REFUND-', '')
        await this.prisma.upward_transaction.update({
          where: { reference: originalTxRef },
          data: { settlementStatus: isSuccess ? 'REFUNDED' : 'PENDING_REFUND' }
        })
      }

      return { success: true }
    }

    return { success: true, message: 'Event ignored' }
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
    private readonly prisma: PrismaService,
  ) { }

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    const pending = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING')
    const partial = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL')
    
    // Fetch Refund Alerts
    const refundAlerts = await this.prisma.upward_transaction.findMany({
      where: { userId: user.id!, settlementStatus: 'PENDING_REFUND' } as any,
      include: { paymentRequest: true }
    })

    const payments = [...pending, ...partial]

    const paymentsData = await Promise.all(payments.map(async (p: any) => {
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
        type: 'invoice'
      }
    }))

    const alertsData = refundAlerts.map(a => ({
      id: a.id,
      uuid: a.uuid,
      amount: a.amount,
      currency: a.currency,
      reference: a.reference,
      status: 'PENDING_REFUND',
      type: 'refund_alert',
      description: 'Refund Pending: Full payment requirement not met',
      property_address: a.propertyAddress || 'Your Property'
    }))

    return [...alertsData, ...paymentsData]
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



@Injectable()
export class GetLandlordPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(subaccountCode: string) {
    return this.prisma.upward_settlement_batch.findMany({
      where: { landlordId: subaccountCode },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })
  }
}

@Injectable()
export class GetPayoutBreakdownUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(batchUuid: string) {
    return this.prisma.upward_settlement_batch.findUnique({
      where: { uuid: batchUuid },
      include: {
        transactions: {
          include: {
            paymentRequest: {
              include: {
                userProperty: {
                  include: {
                    location: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }
}

@Injectable()
export class GetPmPayoutsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number) {
    // 1. Find all subaccounts linked to this PM's properties
    const properties = await this.prisma.upward_user_property.findMany({
      where: { pmId },
      select: { subaccountId: true },
      distinct: ['subaccountId']
    })

    const subaccountIds = properties
      .map(p => p.subaccountId)
      .filter((id): id is number => id !== null)

    if (subaccountIds.length === 0) return []

    const subaccounts = await this.prisma.upward_paystack_subaccount.findMany({
      where: { id: { in: subaccountIds } },
      select: { subaccountCode: true }
    })

    const subaccountCodes = subaccounts.map(s => s.subaccountCode)

    // 2. Fetch all payout batches for these subaccounts
    return this.prisma.upward_settlement_batch.findMany({
      where: { landlordId: { in: subaccountCodes } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })
  }
}
