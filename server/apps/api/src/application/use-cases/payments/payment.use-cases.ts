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
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { randomUUID } from 'crypto'

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
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & {
      userId: string
      userPropertyUuid?: string
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
        data.amount = verifiedData.amount
      }

      let pr: any = null
      let excess = 0
      let remaining = 0

      if (isVerified && data.type === 'RENT' && !data.paymentRequestId && data.userPropertyUuid) {
        const prop = await this.propertyRepo.findByUuid(data.userPropertyUuid)
        if (prop) {
           const existingPending = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING');
           const existingPartial = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL');
           const matchingPRs = [...existingPending, ...existingPartial].filter(p => p.userPropertyId === prop.id);
           
           if (matchingPRs.length > 0) {
              data.paymentRequestId = matchingPRs[0]?.id;
              this.logger.log(`Linked manual rent payment to existing payment request: ${data.paymentRequestId}`);
           }
        }
      }

      if (isVerified && data.paymentRequestId) {
        pr = await this.paymentRequestRepo.findById(data.paymentRequestId)
        if (pr) {
          remaining = Math.max(0, pr.amount - (pr.amountPaid || 0))
          excess = Math.max(0, data.amount - remaining)
        }
      }

      let paymentAmount = pr ? Math.min(data.amount, remaining) : data.amount

      let userPropertyIdToSettle: number | null = pr?.userPropertyId || null;

      if (isVerified && data.type === 'RENT' && !pr && data.userPropertyUuid) {
        const prop = await this.propertyRepo.findByUuid(data.userPropertyUuid)
        if (prop) {
           userPropertyIdToSettle = prop.id!;
        }
      }

      const result = await this.txRepo.create({
        ...data,
        userId: user.id!,
        amount: paymentAmount,
        status: isVerified ? 'SUCCESS' : 'FAILED',
      } as any)
      this.logger.log(`Transaction recorded successfully with ID: ${result.id}`)

      if (isVerified && result.status === 'SUCCESS') {
        try {
          let rentPortion = paymentAmount;

          if (pr) {
            const newAmountPaid = (pr.amountPaid || 0) + paymentAmount
            const newStatus = newAmountPaid >= pr.amount ? 'PAID' : 'PARTIAL'

            await this.paymentRequestRepo.update(pr.id!, {
              amountPaid: Math.min(newAmountPaid, pr.amount),
              status: newStatus,
              paidAt: newStatus === 'PAID' ? new Date() : undefined,
            })

            if (data.lineItems && Array.isArray(data.lineItems)) {
              const existingItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!)
              if (existingItems.length === 0) {
                 await this.lineItemRepo.bulkCreate(data.lineItems.map(li => ({
                    paymentRequestId: pr.id!,
                    name: li.label || li.name,
                    totalAmount: li.amount,
                    amountPaid: 0,
                    status: 'PENDING'
                 })))
              }

              const currentItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!)
              rentPortion = 0;

              let remainingPayment = paymentAmount
              for (const item of currentItems) {
                 if (remainingPayment <= 0) break;
                 const need = item.totalAmount - item.amountPaid
                 const paymentToItem = Math.min(remainingPayment, need)
                 
                 const newItemPaid = item.amountPaid + paymentToItem
                 await this.lineItemRepo.update(item.id!, {
                    amountPaid: newItemPaid,
                    status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
                 })

                 if (item.name.toLowerCase().includes('rent')) {
                    rentPortion += paymentToItem
                 }

                 remainingPayment -= paymentToItem
              }
            }

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
          } else {
             if (data.lineItems && Array.isArray(data.lineItems) && data.lineItems.length > 0) {
                 rentPortion = 0;
                 let remainingPayment = paymentAmount;
                 for (const item of data.lineItems) {
                    if (remainingPayment <= 0) break;
                    const itemName = (item.label || item.name || '').toLowerCase()
                    const itemTotal = Number(item.amount || 0);
                    const paymentToItem = Math.min(remainingPayment, itemTotal);

                    if (itemName.includes('rent')) {
                       rentPortion += paymentToItem;
                    }

                    remainingPayment -= paymentToItem;
                 }
             }
          }


          if (userPropertyIdToSettle && data.type === 'RENT') {
            const prop = await this.propertyRepo.findById(userPropertyIdToSettle)
            if (prop) {
               const totalRentPaidForProp = (prop.amountPaid || 0) + rentPortion
               const totalOwedForProp = prop.rentAmount || (pr ? pr.amount : 0)
               const newRemaining = Math.max(0, totalOwedForProp - totalRentPaidForProp)

               const updateData: any = {
                  amountPaid: totalRentPaidForProp,
                  amountRemaining: newRemaining
               }

                if (newRemaining === 0 && totalRentPaidForProp >= totalOwedForProp && totalOwedForProp > 0) {
                   const overpayment = totalRentPaidForProp - totalOwedForProp;
                   
                   if (prop.rentEndDate) {
                      const newDate = new Date(prop.rentEndDate)
                      newDate.setFullYear(newDate.getFullYear() + 1)
                      updateData.rentEndDate = newDate
                      
                      const nextYearRent = prop.rentAmount || totalOwedForProp;
                      updateData.amountPaid = overpayment;
                      updateData.amountRemaining = Math.max(0, nextYearRent - overpayment);

                      this.logger.log(`Property ${prop.uuid} fully settled. Rent due date moved to ${newDate.toISOString()}. Resetting for next cycle with ${overpayment} overpayment carried over.`)
                   }

                  await this.prisma.upward_notification.create({
                    data: {
                      userId: user.id!,
                      title: 'Credit Score Boost!',
                      message: `Congratulations! Your full rent payment for ${data.propertyAddress || 'your property'} has boosted your credit health.`,
                      type: 'PAYMENT'
                    }
                  })

                  this.logger.log(`Triggered credit score boost for user ${user.id} on property ${prop.uuid}`)
                  
                  await this.prisma.upward_notification.updateMany({
                    where: {
                      userId: user.id!,
                      type: 'RENT_REMINDER',
                      message: { contains: prop.uuid }
                    },
                    data: { isRead: true }
                  })

                  const virtualId = 1000000 + prop.id!
                  await this.prisma.upward_user_announcement_state.upsert({
                    where: { userId_announcementId: { userId: user.id!, announcementId: virtualId } },
                    create: { userId: user.id!, announcementId: virtualId, interactedBanner: true, interactedPopup: true },
                    update: { interactedBanner: true, interactedPopup: true }
                  }).catch(() => {})
               }

               await this.propertyRepo.update(prop.id!, updateData)
            }
          }
        } catch (e) {
           this.logger.error(`Error in settlement logic: ${e}`)
        }
      }
      return result;
    } catch (e) {
      this.logger.error(`Failed to handle transaction: ${e}`)
      throw e;
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
  constructor(
    private readonly receiptService: ReceiptService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(data: ReceiptPdfData & { userPropertyId?: number; companyName?: string; managerName?: string }): Promise<string> {
    if (data.paidAt && typeof data.paidAt === 'string') {
      data.paidAt = new Date(data.paidAt)
    }

    // 1. Resolve Property Details
    if (data.userPropertyId) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { id: Number(data.userPropertyId) },
        include: {
          location: true,
          company: true,
          manager: true
        }
      })

      if (prop) {
        // Concatenated location string
        const loc = prop.location
        const addressParts = [
          loc?.address || loc?.area,
          loc?.state,
          loc?.country
        ].filter(Boolean)
        
        data.propertyAddress = addressParts.join(', ')

        // Resolve Recipient (Landlord Name)
        // If company exists, use company, else manager
        if (prop.company) {
          data.landlordName = prop.company.name
        } else if (prop.manager) {
          data.landlordName = `${prop.manager.firstName} ${prop.manager.lastName}`
        } else if (data.companyName) {
           data.landlordName = data.companyName
        } else if (data.managerName) {
           data.landlordName = data.managerName
        }
      }
    } else {
       // Manual payment Case: if no userPropertyId, use provided names
       if (data.companyName) {
         data.landlordName = data.companyName
       } else if (data.managerName) {
         data.landlordName = data.managerName
       }
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
        userPropertyUuid: p.userPropertyUuid,
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
@Injectable()
export class GetPropertyBalanceUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
  ) {}

  async execute(propertyUuid: string) {
    const prop = await this.propertyRepo.findByUuid(propertyUuid)
    if (!prop) throw new Error('Property not found')

    const allPending = await this.paymentRequestRepo.findByUserIdAndStatus(prop.userId, 'PENDING')
    const allPartial = await this.paymentRequestRepo.findByUserIdAndStatus(prop.userId, 'PARTIAL')
    
    // We still find active requests to flag 'hasActiveRequest'
    const propRequests = [...allPending, ...allPartial].filter(p => p.userPropertyId === prop.id)
    const requestTotal = propRequests.reduce((sum, pr) => sum + pr.amount, 0)

    // Source of Truth: The property record fields themselves (settled by RecordTransactionUseCase)
    const totalOwed = prop.rentAmount || requestTotal || 0
    const amountPaid = prop.amountPaid || 0
    const remainingBalance = prop.amountRemaining !== null && prop.amountRemaining !== undefined
       ? prop.amountRemaining
       : Math.max(0, totalOwed - amountPaid)
    
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
