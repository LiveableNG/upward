import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  ReceiptService,
  ReceiptPdfData,
} from '../../../shared/infrastructure/common/receipt/receipt.service'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentUpdatedEvent } from '../../events/definition/payment-updated.event'
import {
  ISavedLandlordRepository,
  ITransactionRepository,
  SAVED_LANDLORD_REPOSITORY,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  PAYMENT_REQUEST_REPOSITORY,
  OVERPAYMENT_REPOSITORY,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentGateway,
  IPaymentRequestRepository,
  IOverpaymentRepository,
  IPaymentLineItemRepository,
  SavedLandlord,
  Transaction,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class SaveLandlordUseCase {
  constructor(
    @Inject(SAVED_LANDLORD_REPOSITORY)
    private readonly landlordRepo: ISavedLandlordRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(data: Omit<SavedLandlord, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & { userId: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new Error('User not found')

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
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new Error('User not found')
    return this.landlordRepo.findByUserId(user.id!)
  }
}

export interface LineItemPayment {
  id: number
  amountPaid: number
  name?: string // editable name (used for Future Credit items)
}

@Injectable()
export class RecordTransactionUseCase {
  private readonly logger = new Logger(RecordTransactionUseCase.name)

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(OVERPAYMENT_REPOSITORY)
    private readonly overpaymentRepo: IOverpaymentRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & {
      userId: string
      lineItemPayments?: LineItemPayment[]
      futureCreditName?: string
    }
  ) {
    try {
      this.logger.log(`Recording transaction for reference: ${data.reference}`)

      const user = await this.userRepository.findByUuid(data.userId)
      if (!user) throw new Error('User not found')

      // Idempotency check
      const existing = await this.txRepo.findByReference(data.reference)
      if (existing) {
        this.logger.warn(`Transaction with reference ${data.reference} already exists. Returning existing record.`)
        return existing
      }

      // Verification
      let verifiedData: any = { status: false }
      try {
        verifiedData = await this.gateway.verifyTransaction(data.reference)
      } catch (e) {
        this.logger.error(`Gateway verification failed for ${data.reference}:`, e)
      }

      const isVerified = verifiedData.status
      if (isVerified && verifiedData.amount !== undefined) {
        // Essential: use the actual verified amount from the gateway 
        // to prevent recording original request amount if a partial/different amount was paid
        data.amount = verifiedData.amount
      }

      let pr: any = null
      let excess = 0
      let remaining = 0

      if (isVerified && data.paymentRequestId) {
        pr = await this.paymentRequestRepo.findById(data.paymentRequestId)
        if (pr) {
          remaining = Math.max(0, pr.amount - (pr.amountPaid || 0))
          excess = Math.max(0, data.amount - remaining)
        }
      }

      // Main PAYMENT transaction — amount capped at remaining balance
      const paymentAmount = pr ? Math.min(data.amount, remaining) : data.amount

      const result = await this.txRepo.create({
        ...data,
        userId: user.id!,
        amount: paymentAmount,
        status: isVerified ? 'SUCCESS' : 'FAILED',
      } as any)
      this.logger.log(`Transaction recorded successfully with ID: ${result.id}`)

      if (isVerified && pr) {
        try {
          const newAmountPaid = (pr.amountPaid || 0) + paymentAmount
          const newStatus = newAmountPaid >= pr.amount ? 'PAID' : 'PARTIAL'

          await this.paymentRequestRepo.update(pr.id!, {
            amountPaid: Math.min(newAmountPaid, pr.amount),
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : undefined,
          })

          // Update individual line item paid amounts
          if (data.lineItemPayments && data.lineItemPayments.length > 0) {
            const allItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!)

            for (const lip of data.lineItemPayments) {
              const existingItem = allItems.find(i => i.id === lip.id)
              if (existingItem) {
                const newItemPaid = (existingItem.amountPaid || 0) + lip.amountPaid
                const itemStatus =
                  newItemPaid >= existingItem.totalAmount ? 'PAID' :
                  newItemPaid > 0 ? 'PARTIAL' : 'PENDING'

                await this.lineItemRepo.update(lip.id, {
                  name: lip.name || existingItem.name,
                  amountPaid: Math.min(newItemPaid, existingItem.totalAmount),
                  status: itemStatus,
                })
              }
            }
          }

          // Overpayment: separate FUTURE_CREDIT transaction
          if (excess > 0) {
            const futureCreditRef = `FC_${data.reference}`
            const existingFc = await this.txRepo.findByReference(futureCreditRef)

            if (!existingFc) {
              const futureCreditName = data.futureCreditName || 'Future Credit'
              await this.txRepo.create({
                userId: user.id!,
                type: data.type || 'RENT',
                status: 'SUCCESS',
                amount: excess,
                currency: data.currency || 'NGN',
                reference: futureCreditRef,
                narration: futureCreditName,
                paymentRequestId: pr.id,
                propertyAddress: data.propertyAddress,
                lineItems: [{ name: futureCreditName, amount: excess }],
              } as any)

              await this.overpaymentRepo.create({
                userId: user.id!,
                amount: excess,
                currency: data.currency || 'NGN',
                transactionId: result.id,
                paymentRequestId: pr.id,
                status: 'AVAILABLE',
              })
              this.logger.log(`Overpayment of ${excess} recorded as Future Credit for user ${user.id}`)
            }
          }

          // Dispatch Webhook Asynchronously
          if (pr.platformId) {
            this.eventBus.publish(new PaymentUpdatedEvent(
              pr.platformId,
              'payment.updated',
              {
                event: 'payment.updated',
                data: {
                  paymentUuid: pr.uuid,
                  reference: data.reference,
                  amountPaid: paymentAmount,
                  totalPaid: Math.min(newAmountPaid, pr.amount),
                  remainingAmount: Math.max(0, pr.amount - newAmountPaid),
                  overpaymentAmount: excess > 0 ? excess : 0,
                  currency: pr.currency,
                  description: pr.description,
                  status: newStatus,
                  paidAt: new Date(),
                  customerEmail: user.email,
                }
              }
            ))
          }
        } catch (e) {
          this.logger.error(`Failed to update payment request ${data.paymentRequestId}:`, e)
        }
      }

      return result
    } catch (error) {
      this.logger.error(`Failed to record transaction ${data.reference}:`, error)
      throw error
    }
  }
}

@Injectable()
export class GetBanksUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute() {
    return this.gateway.getBanks()
  }
}

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
  ) {}

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
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new Error('User not found')
    return this.txRepo.findByUserId(user.id!)
  }
}

@Injectable()
export class VerifyAccountUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
  ) {}

  async execute(accountNumber: string, bankCode: string) {
    return this.gateway.verifyAccountNumber(accountNumber, bankCode)
  }
}
@Injectable()
export class GenerateReceiptPdfUseCase {
  constructor(private readonly receiptService: ReceiptService) {}

  async execute(data: ReceiptPdfData): Promise<string> {
    if (data.paidAt && typeof data.paidAt === 'string') {
      data.paidAt = new Date(data.paidAt)
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
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new Error('User not found')

    // Fetch both PENDING and PARTIAL payments
    const pending = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING')
    const partial = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL')

    const payments = [...pending, ...partial]

    return Promise.all(payments.map(async (p) => {
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
        payment_link_token: p.uuid,
        invoice_number: p.reference || p.uuid.slice(-8),
        description: p.description || 'Property Payment',
        subaccountCode: p.subaccount?.subaccountCode || null,
        company_name: p.companyName,
        manager_name: p.managerName,
        property_address: p.propertyLocation,
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
  ) {}

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
