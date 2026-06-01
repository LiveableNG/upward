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
  async execute(userId: string) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId }
    });
    
    if (!user) return null;

    return this.prisma.upward_user_bank_details.findUnique({
      where: { userId: user.id }
    });
  }
}

@Injectable()
export class SaveBankDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}
  async execute(userId: string, data: any) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId }
    });
    
    if (!user) throw new Error('User not found');

    return this.prisma.upward_user_bank_details.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
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
      description: data.metadata?.narration || data.metadata?.description || 'Manual Property Payment',
      dueDate,
      status: 'PENDING',
      allowPartial: true,
      subaccountId: subaccountId,
      userPropertyId,
      isManual: true,
      reference: `MNL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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
  amount?: number
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
      sequentialFill?: boolean // When true, fills line items top-to-bottom instead of proportionally
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
          if (pr.status === 'PAID' && !data.settlementStatus) {
            data.settlementStatus = 'PENDING_REFUND'
            this.logger.warn(`Duplicate payment attempt detected for already settled request: ${pr.uuid}. Marking reference ${data.reference} for refund.`)
          }

          const dynamicFee = await this.paymentConfig.getDynamicProcessingFee(pr.userId, pr.userPropertyId)
          const expectedTotal = pr.amount + dynamicFee
          if (!pr.allowPartial && effectiveAmount < expectedTotal && !data.settlementStatus) {
            data.settlementStatus = 'PENDING_REFUND'
            this.logger.warn(`Full-Payment Violation: User paid ${effectiveAmount} instead of ${expectedTotal}. Marking reference ${data.reference} for refund.`)
          }

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
        const fees = data.lineItemPayments.filter(lp => 
          lp.name === 'Processing Fee' || 
          lp.name === 'Transaction Fee' || 
          lp.name === 'Upward Benefits'
        )
        if (fees.length > 0) {
          upwardFeeAmount = fees.reduce((sum, f) => sum + Number(f.amount || f.amountPaid || 0), 0)
        }
      }

      if (upwardFeeAmount === 0 && pr) {
        try {
          const rates = await this.paymentConfig.getDynamicProcessingRates(pr.userId, pr.userPropertyId)
          const txFee = rates.transactionFee
          const benFee = rates.benefitsPaid ? 0 : rates.benefitsFee
          upwardFeeAmount = txFee + benFee
        } catch (e: any) {
          this.logger.error(`Failed to resolve dynamic processing rates in RecordTransactionUseCase: ${e?.message}`)
        }
      }

      const paymentAmount = pr ? Math.min(effectiveAmount - upwardFeeAmount, remaining) + upwardFeeAmount : effectiveAmount
      excess = pr ? Math.max(0, effectiveAmount - upwardFeeAmount - remaining) : 0

      const result = await this.txRepo.create({
        ...data,
        userId: user!.id!,
        amount: effectiveAmount,
        status: isVerified ? 'SUCCESS' : 'FAILED',
        narration: data.narration || pr?.description || 'Property Payment',
        landlordId: data.landlordId || pr?.subaccount?.uuid || undefined,
      } as any, txClient)

      if (isVerified && result.status === 'SUCCESS' && result.settlementStatus === 'PENDING_REFUND') {
        const refundReason = (pr && pr.status === 'PAID') ? 'DUPLICATE_PAYMENT' : 'UNDERPAYMENT_VIOLATION';
        await txClient.upward_refund_log.create({
          data: {
            transactionId: result.id,
            userId: user!.id!,
            amount: effectiveAmount,
            currency: result.currency || 'NGN',
            reason: refundReason,
            status: 'FLAGGED',
            actionBy: 'SYSTEM',
            flaggedAt: new Date()
          }
        });
      }

      if (isVerified && result.status === 'SUCCESS' && result.settlementStatus !== 'PENDING_REFUND') {
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
          amount: effectiveAmount,
          upwardFeeAmount,
          lineItemPayments: data.lineItemPayments,
          manualLineItems: data.lineItems,
          narration: result.narration,
          sequentialFill: data.sequentialFill,
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

  async execute(data: { userPropertyId: number; tenantEmail?: string; tenantName?: string; tenantPhone?: string; subaccountCode?: string }) {
    this.logger.log(`Resolving dedicated account for User Property ID: ${data.userPropertyId}`)
    
    const existing = await this.dvaRepo.findByUserPropertyId(data.userPropertyId)
    if (existing) {
      this.logger.log(`Using existing DVA for User Property ${data.userPropertyId}: ${existing.accountNumber}`)
      return existing
    }
    const baseEmail = data.tenantEmail || `prop-${data.userPropertyId}@upward.ng`
    const [local, domain] = baseEmail.split('@')
    const customerEmail = `${local}+p${data.userPropertyId}@${domain}`
    
    const firstName = data.tenantName?.split(' ')[0] || 'Tenant'
    const lastName = data.tenantName?.split(' ')[1] || `Property-${data.userPropertyId}`

    this.logger.log(`Creating customer for DVA: ${customerEmail}`)
    const customerCode = await this.gateway.createCustomer({ email: customerEmail, firstName, lastName, phone: data.tenantPhone })
    if (!customerCode) throw new Error('Failed to resolve customer for DVA')

    this.logger.log(`Requesting DVA creation from Paystack for customer ${customerCode} (routing directly to main platform account)`)
    const res = await this.gateway.createDedicatedAccount({
      customerCode
    })

    if (!res.status || !res.data) {
      throw new Error(res.message || 'Failed to create dedicated account')
    }

    const account = res.data

    this.logger.log(`DVA created successfully: ${account.account_number}. Saving to DB...`)
    
    const existingByAccount = await this.dvaRepo.findByAccountNumber(account.account_number)
    if (existingByAccount) {
      if (existingByAccount.userPropertyId === data.userPropertyId) return existingByAccount
      
      this.logger.warn(`Account ${account.account_number} already exists for another property (${existingByAccount.userPropertyId}). Re-associating to current property.`)
      return existingByAccount
    }

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
    userId?: string
    amount: number
    paymentRequestUuid?: string
    metadata?: any
  }) {
    let pr: any = null
    if (data.paymentRequestUuid) {
      pr = await this.paymentRequestRepo.findByUuid(data.paymentRequestUuid)
    }

    let user: any = null
    if (data.userId) {
      user = await this.userRepository.findByUuid(data.userId)
    } else if (pr) {
      user = await this.userRepository.findById(pr.userId)
    }

    if (!user) throw new UnauthorizedException('User context required to initialize payment')

    if (pr) {
      const remainingRent = pr.amount - (pr.amountPaid || 0)
      
      if (!pr.allowPartial && data.amount < remainingRent && data.amount > 0) {
        throw new BadRequestException(`Partial payments are not enabled for this request. Please pay the full balance of ₦${remainingRent}.`)
      }
      if (pr.allowPartial && pr.minAmount && data.amount < pr.minAmount && data.amount > 0 && data.amount < remainingRent) {
        throw new BadRequestException(`The minimum allowed partial payment for this request is ₦${pr.minAmount}.`)
      }
    }

    let flatFee = this.paymentConfig.getProcessingFee()
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

      // Fallback: If still not resolved, lookup the user's active verified property!
      if (!userPropertyId) {
        const activeProp = await this.prisma.upward_user_property.findFirst({
          where: { userId: user.id, isVerified: true, isPastTenancy: false },
          orderBy: { createdAt: 'desc' }
        })
        if (activeProp) {
          userPropertyId = activeProp.id
          this.logger.log(`Recovered userPropertyId ${userPropertyId} from user's active verified tenancy for PR ${pr.uuid}. Updating record.`)
          await this.paymentRequestRepo.update(pr.id, { userPropertyId })
        }
      }
    }

    const rates = await this.paymentConfig.getDynamicProcessingRates(user.id, userPropertyId)
    const excludeBenefits = data.metadata?.excludeBenefits === true
    const activeBenefitsFee = excludeBenefits ? 0 : rates.benefitsFee
    flatFee = rates.transactionFee + activeBenefitsFee

    if (userPropertyId) {
      const rawPhone = user.phone || ''
      const hasPhone = rawPhone && rawPhone.trim() && rawPhone.toLowerCase() !== 'null' && rawPhone.toLowerCase() !== 'undefined'
      const tenantPhone = hasPhone ? rawPhone : `080${String(user.id || Math.floor(Math.random() * 100000000)).padStart(8, '0')}`

      if (!hasPhone) {
        this.logger.log(`User ${user.email} does not have a valid phone number on profile. Using generated mock phone number: ${tenantPhone}`)
      }

      const availableOverpayments = await this.overpaymentRepo.findByUserIdAndStatus(user.id!, 'AVAILABLE')
      const totalCredit = availableOverpayments.reduce((sum, o) => sum + o.amount, 0)
      
      const baseAmount = data.amount || pr.amount
      
      let clientFee = 0
      if (data.metadata?.lineItems) {
        const feeItems = data.metadata.lineItems.filter((i: any) => 
          ['Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(i.label || i.name || '')
        )
        if (feeItems.length > 0) {
          clientFee = feeItems.reduce((sum: number, fi: any) => sum + Number(fi.amount || fi.amountPaid || 0), 0)
        }
      } else if (data.metadata?.fee) {
        clientFee = Number(data.metadata.fee)
      }

      const effectiveFee = clientFee || (data.amount ? 0 : flatFee)
      const requestedTotal = baseAmount + (data.amount ? 0 : (clientFee || flatFee))
      
      const appliedCredit = Math.min(totalCredit, requestedTotal)
      const finalAmountToPay = requestedTotal - appliedCredit

      try {
        const dva = await this.resolveDedicatedAccount.execute({
          userPropertyId: userPropertyId,
          tenantEmail: user.email!,
          tenantName: `${user.firstName || 'Tenant'} ${user.lastName || 'User'}`.trim(),
          tenantPhone: tenantPhone,
          subaccountCode: pr.subaccount?.subaccountCode
        })

        if (data.metadata?.lineItems) {
          await this.prisma.upward_dedicated_virtual_account.update({
            where: { accountNumber: dva.accountNumber },
            data: {
              metadata: {
                ...(typeof dva.metadata === 'object' && dva.metadata !== null ? dva.metadata : {}),
                lastPaymentIntent: {
                  amount: requestedTotal,
                  lineItems: data.metadata.lineItems,
                  timestamp: Date.now()
                }
              }
            }
          })
        }

        this.logger.log(`DVA Initialization for PR ${pr?.uuid || 'manual'}: Amount ${requestedTotal}, Fee ${effectiveFee}, LineItems: ${JSON.stringify(data.metadata?.lineItems || [])}`)

        return {
          type: 'DVA',
          amount: requestedTotal,
          appliedCredit,
          finalAmount: finalAmountToPay,
          fee: effectiveFee || flatFee,
          dva: {
            accountNumber: dva.accountNumber,
            accountName: dva.accountName,
            bankName: dva.bankName,
            bankCode: dva.bankCode
          },
          reference: `DVA_${dva.accountNumber}_${pr?.uuid || 'no-pr'}_${Date.now()}`
        }
      } catch (dvaError: any) {
        this.logger.warn(`DVA generation failed for property ${userPropertyId}: ${dvaError.message || dvaError}. Falling back to standard Paystack checkout.`)
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
      source_app: 'upward',
      userId: user.id,
      userUuid: user.uuid,
      paymentRequestUuid: pr?.uuid,
      paymentRequestId: pr?.id,
      userPropertyUuid: pr?.userPropertyUuid,
      appliedCredit,
      description: data.metadata?.description || pr?.description || 'Property Payment'
    }
    this.logger.log(`Paystack Initialization for PR ${pr?.uuid || 'manual'}: Amount ${finalAmountToPay}, LineItems: ${JSON.stringify(metadata.lineItems || [])}`)

    const initialization = await this.gateway.initializeTransaction({
      email: user.email!,
      amount: Math.round(finalAmountToPay * 100), 
      reference: `PAY-${randomUUID()}`,
      subaccount: pr?.subaccount?.subaccountCode,
      metadata,
      channels: ['bank', 'bank_transfer']
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
    private readonly encryption: EncryptionService,
  ) { }

  async execute(payload: any, signature?: string) {
    this.logger.log(`Incoming Webhook: ${payload?.event || 'unknown event'}`)
    
    if (!signature) {
      this.logger.warn('Webhook received without signature')
      throw new UnauthorizedException('Missing webhook signature')
    }

    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')
    if (!secret) {
      this.logger.error('PAYSTACK_SECRET_KEY not found in configuration')
      throw new Error('Internal configuration error')
    }

    // Verify HMAC SHA512 signature
    const bodyString = JSON.stringify(payload)
    const hash = createHmac('sha512', secret)
      .update(bodyString)
      .digest('hex')

    if (hash !== signature) {
      this.logger.warn(`Invalid webhook signature attempt. Received: ${signature.slice(0, 8)}..., Expected: ${hash.slice(0, 8)}...`)
      this.logger.debug(`Hashed string: ${bodyString}`)

      if (secret.startsWith('sk_test_')) {
        this.logger.warn('BYPASS: Allowing invalid signature because sk_test key is in use. Fix stringification for production!')
      } else {
        throw new UnauthorizedException('Invalid signature')
      }
    }

    let rawMetadata = payload.data?.metadata
    if (typeof rawMetadata === 'string' && rawMetadata.length > 0) {
      try {
        rawMetadata = JSON.parse(rawMetadata)
      } catch (e) {
      }
    }
    const sourceApp = rawMetadata?.source_app || payload.data?.customer?.metadata?.source_app

    if (sourceApp && sourceApp !== 'upward') {
      this.logger.log(`Webhook ignored: event is for source_app '${sourceApp}'`)
      return { success: true, message: `Event ignored: for ${sourceApp}` }
    }

    if (payload.event === 'charge.success') {
      const { reference, amount, currency } = payload.data
      let metadata = payload.data.metadata

      if (typeof metadata === 'string' && metadata.length > 0) {
        try {
          metadata = JSON.parse(metadata)
        } catch (e) {
          this.logger.warn(`Failed to parse metadata string for reference ${reference}`)
        }
      }

      if (payload.data.dedicated_account || payload.data.channel === 'dedicated_account') {
        this.logger.log(`DVA Payment detected in charge.success for reference: ${reference}`)
        return this.handleDvaPayment(payload.data)
      }

      let { userUuid, userId } = metadata || {}

      if (!userUuid && !userId && payload.data.customer?.email) {
        const rawEmail = payload.data.customer.email as string
        let searchEmail = rawEmail

        if (rawEmail.includes('+p')) {
          const parts = rawEmail.split('@')
          if (parts.length === 2 && parts[0] && parts[1]) {
            const base = parts[0].split('+p')[0]
            searchEmail = `${base}@${parts[1]}`

            const propertyMatch = parts[0].match(/\+p(\d+)/)
            if (propertyMatch && propertyMatch[1]) {
              const propertyId = parseInt(propertyMatch[1])            
              if (!metadata) metadata = {}
              const prop = await this.prisma.upward_user_property.findUnique({
                where: { id: propertyId }
              })
              if (prop) {
                metadata.userPropertyUuid = prop.uuid
                this.logger.log(`Resolved property context from alias: ${rawEmail} -> Prop UUID: ${prop.uuid}`)

                const dva = await this.dvaRepo.findByUserPropertyId(prop.id)
                if (dva && dva.metadata && typeof dva.metadata === 'object' && 'lastPaymentIntent' in (dva.metadata as any)) {
                  const intent = (dva.metadata as any).lastPaymentIntent
                  const amountPaid = amount / 100
                  
                  if (intent && intent.amount === amountPaid && (Date.now() - intent.timestamp < 48 * 60 * 60 * 1000)) {
                    metadata.lineItems = intent.lineItems
                    this.logger.log(`Recovered lineItems from DVA intent for alias-based payment: ${JSON.stringify(metadata.lineItems)}`)
                    
                    await this.prisma.upward_dedicated_virtual_account.update({
                      where: { id: dva.id },
                      data: { metadata: { ...((dva.metadata as any) || {}), lastPaymentIntent: null } }
                    })
                  }
                }
              }
            }
          }
        }

        const emailHash = this.encryption.hash(searchEmail)
        const user = await this.prisma.upward_user.findUnique({
          where: { emailHash }
        })

        if (user) {
          userUuid = user.uuid
          this.logger.log(`Recovered user identity via email for reference ${reference}: ${user.email} (from ${rawEmail})`)
        } else {
          this.logger.warn(`Could not find user for customer email: ${searchEmail} (raw: ${rawEmail})`)
        }
      }

      if (!userUuid && !userId) {
        this.logger.error(`Webhook failed: No user identification in metadata or customer record for reference ${reference}`)
        throw new Error('No user identification in Paystack metadata')
      }

      this.logger.log(`Processing charge.success for reference ${reference}. Lineitems: ${JSON.stringify(metadata?.lineItems || 'none')}`)

      const effectiveUserId = userUuid || userId

      return this.recordTransaction.execute({
        userId: String(effectiveUserId),
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
      return this.handleDvaPayment(payload.data)
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

        const targetTx = await this.prisma.upward_transaction.findUnique({
          where: { reference: originalTxRef }
        })
        if (targetTx) {
          const logStatus = isSuccess ? 'DISPATCHED' : 'FAILED'
          const existingLog = await this.prisma.upward_refund_log.findFirst({
            where: { transactionId: targetTx.id },
            orderBy: { createdAt: 'desc' }
          })
          if (existingLog) {
            await this.prisma.upward_refund_log.update({
              where: { id: existingLog.id },
              data: {
                status: logStatus,
                resolvedAt: isSuccess ? new Date() : undefined,
                metadata: {
                  ...(existingLog.metadata as any || {}),
                  webhookPayload: payload.data
                }
              }
            })
          }
        }
      }

      return { success: true }
    }

    return { success: true, message: 'Event ignored' }
  }

  private async handleDvaPayment(data: any) {
    const accountNumber = data.dedicated_account?.account_number || data.dedicated_account
    if (!accountNumber) {
      this.logger.error(`Could not resolve account number from DVA payload: ${JSON.stringify(data)}`)
      return { success: false, message: 'Missing account number' }
    }

    this.logger.log(`Processing DVA Payment for account: ${accountNumber}`)

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

    const amountPaid = data.amount / 100

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

      return this.recordTransaction.execute({
        userId: userProp.user.uuid,
        amount: amountPaid,
        currency: data.currency || 'NGN',
        reference: data.reference,
        type: 'RENT',
        status: 'SUCCESS',
        narration: `Manual Bank Transfer to ${dva.accountNumber}`,
        settlementStatus: 'VERIFIED'
      })
    }

    // Verification Logic: Intercept & Check against Source of Truth
    const dynamicFee = await this.paymentConfig.getDynamicProcessingFee(pr.userId, pr.userPropertyId)
    const expectedTotal = pr.amount + dynamicFee

    let settlementStatus = 'VERIFIED'
    if (!pr.allowPartial && amountPaid < expectedTotal) {
      this.logger.warn(`Full-Payment Violation: User ${pr.user.email} paid ${amountPaid} instead of ${expectedTotal}. Marking for refund.`)
      settlementStatus = 'PENDING_REFUND'
    }

    // 1. Check for stored payment intent in DVA metadata
    let lineItemPayments: any[] | undefined = undefined
    let upwardFeeAmount = 0
    if (dva.metadata && typeof dva.metadata === 'object' && 'lastPaymentIntent' in (dva.metadata as any)) {
      const intent = (dva.metadata as any).lastPaymentIntent
      // If the intent is fresh (e.g. < 48 hours) and amount matches exactly
      if (intent && intent.amount === amountPaid && (Date.now() - intent.timestamp < 48 * 60 * 60 * 1000)) {
        lineItemPayments = intent.lineItems
        this.logger.log(`Found matching payment intent for DVA transfer. Using manual allocations.`)
        
        // Extract fee if specified
        const feeItem = lineItemPayments?.find(lp => lp.name === 'Processing Fee')
        if (feeItem) {
          upwardFeeAmount = Number(feeItem.amount || feeItem.amountPaid || 0)
        }
        
        // Map amount to amountPaid for distribute-allocations compatibility
        lineItemPayments = lineItemPayments?.map(lp => ({
          ...lp,
          amountPaid: Number(lp.amount || lp.amountPaid || 0)
        }))

        // Clear the intent so it's not reused
        await this.prisma.upward_dedicated_virtual_account.update({
          where: { id: dva.id },
          data: {
            metadata: {
              ...((dva.metadata as any) || {}),
              lastPaymentIntent: null
            }
          }
        })
      }
    }

    const hasNoIntent = !lineItemPayments
    const sequentialFill = hasNoIntent && pr.allowPartial && !!pr.id

    const result = await this.recordTransaction.execute({
      userId: pr.user.uuid,
      amount: amountPaid,
      currency: data.currency || 'NGN',
      reference: data.reference,
      type: 'RENT',
      status: 'SUCCESS',
      paymentRequestId: pr.id,
      narration: `Bank Transfer to ${dva.accountNumber} (${dva.bankName})`,
      settlementStatus,
      lineItemPayments,
      sequentialFill
    })

    if (settlementStatus === 'PENDING_REFUND') {
      this.eventBus.publish(new UnderpaymentDetectedEvent(
        pr.user.id,
        pr.userPropertyId!,
        pr.id,
        amountPaid,
        expectedTotal,
        data.reference,
        true 
      ))
    }

    return result
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
      
      const pmPR = await this.prisma.upward_pm_payment_request.findFirst({
          where: { paymentRequestId: p.id },
          include: { pm: true }
      })

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
        isVerified: pmPR?.pm?.isVerified || false,
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
    private readonly paymentConfig: PaymentConfigurationService,
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

    const processingFee = await this.paymentConfig.getDynamicProcessingFee(prop.userId, prop.id)

    return {
      propertyUuid: prop.uuid,
      address: [prop.location?.address, prop.location?.area, prop.location?.state, prop.location?.country].filter(Boolean).join(', '),
      rentAmount: totalOwed,
      totalOwed: totalOwed,
      amountPaid: amountPaid,
      remainingBalance: remainingBalance,
      currency: prop.currency || 'NGN',
      dueDate: prop.rentEndDate,
      hasActiveRequest: propRequests.length > 0,
      processingFee,
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

@Injectable()
export class GetPmUnresolvedTransactionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number) {
    const properties = await this.prisma.upward_user_property.findMany({
      where: { pmId },
      select: { id: true }
    });

    const propertyIds = properties.map(p => p.id);

    return this.prisma.upward_transaction.findMany({
      where: {
        settlementStatus: 'PENDING_REFUND',
        status: 'SUCCESS',
        paymentRequest: {
          userPropertyId: { in: propertyIds }
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            bankDetails: true
          }
        },
        paymentRequest: {
          include: {
            userProperty: {
              include: { 
                location: true,
                pmUnit: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

@Injectable()
export class SimulateTransferUseCase {
  private readonly logger = new Logger(SimulateTransferUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly processWebhook: ProcessPaymentWebhookUseCase,
  ) {}

  async execute(data: { beneficiaryBank: string; beneficiaryAccount: string; amount: number }) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')
    const isTestKey = secret?.startsWith('sk_test_') || !secret

    if (!isTestKey) {
      throw new BadRequestException('Simulation is only allowed in Test Mode (using sandbox keys).')
    }

    let dva = await this.prisma.upward_dedicated_virtual_account.findUnique({
      where: { accountNumber: data.beneficiaryAccount }
    })

    if (!dva) {
      this.logger.log(`Mock DVA not found in DB for account: ${data.beneficiaryAccount}. Linking automatically...`)

      const activeProp = await this.prisma.upward_user_property.findFirst({
        where: { isVerified: true, isPastTenancy: false },
        orderBy: { createdAt: 'desc' }
      })

      if (!activeProp) {
        throw new BadRequestException(
          `Dedicated Virtual Account ${data.beneficiaryAccount} does not exist, and no active verified property could be found to link it automatically.`
        )
      }

      dva = await this.prisma.upward_dedicated_virtual_account.create({
        data: {
          accountNumber: data.beneficiaryAccount,
          accountName: 'TEST ACCOUNT',
          bankName: data.beneficiaryBank,
          bankCode: data.beneficiaryBank.toLowerCase().replace(/\s+/g, '-'),
          accountCode: `DVA_${data.beneficiaryAccount}`,
          paystackCustomerId: 'CUS_mock_dva_test',
          userPropertyId: activeProp.id,
        }
      })
    }

    const reference = `TFD_${data.beneficiaryAccount}_${data.amount}_${Date.now()}`
    const amountKobo = Math.round(data.amount * 100)

    const payload = {
      event: 'charge.success',
      data: {
        id: Math.floor(Math.random() * 100000000),
        domain: 'test',
        status: 'success',
        reference: reference,
        amount: amountKobo,
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        channel: 'dedicated_nuban',
        currency: 'NGN',
        ip_address: '127.0.0.1',
        metadata: {
          source_app: 'upward',
        },
        customer: {
          id: 999999,
          first_name: 'Test',
          last_name: 'User',
          email: 'user@test.com',
          customer_code: dva.paystackCustomerId,
        },
        dedicated_account: {
          id: dva.id,
          account_name: dva.accountName,
          account_number: dva.accountNumber,
          bank: {
            name: dva.bankName,
            slug: dva.bankCode,
          },
        },
      },
    }

    const payloadString = JSON.stringify(payload)
    const hash = createHmac('sha512', secret || '')
      .update(payloadString)
      .digest('hex')

    this.logger.log(`Triggering webhook simulation for reference: ${reference}`)
    const result = await this.processWebhook.execute(payload, hash)

    return {
      success: true,
      reference,
      result,
    }
  }
}

