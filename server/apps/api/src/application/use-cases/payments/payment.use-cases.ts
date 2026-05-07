import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
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
  SUBACCOUNT_REPOSITORY,
  ISubaccountRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { RENT_CYCLE_REPOSITORY, IRentCycleRepository } from '../../../domains/scoring/rent-cycle.repository'
import { PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository } from '../../../domains/pm/IPropertyRepository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'


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
    @Inject(RENT_CYCLE_REPOSITORY)
    private readonly rentCycleRepo: IRentCycleRepository,
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
  ) { }

  async execute(
    data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'userId'> & {
      userId: string
      userPropertyUuid?: string
      lineItemPayments?: LineItemPayment[]
      futureCreditName?: string
    }
  ) {
    this.logger.log(`Recording transaction for reference: ${data.reference}`)

    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    // Idempotency check (Outside transaction is fine for initial check)
    const existing = await this.txRepo.findByReference(data.reference)
    if (existing) {
      this.logger.warn(`Transaction with reference ${data.reference} already exists. Returning existing record.`)
      return existing
    }

    // Verification (Outside transaction to avoid holding locks during HTTP call)
    let verifiedData: any = { status: false }
    try {
      verifiedData = await this.gateway.verifyTransaction(data.reference)
    } catch (e) {
      this.logger.error(`Gateway verification failed for ${data.reference}:`, e)
      // Stop execution. No database write will happen.
      throw e
    }

    const isVerified = verifiedData.status
    if (isVerified && verifiedData.amount !== undefined) {
      data.amount = verifiedData.amount
    }

    this.logger.log(`[Settlement] Starting settlement for ref: ${data.reference}. Amount: ${data.amount}`);

    return await this.prisma.$transaction(async (txClient) => {
      this.logger.log(`[Settlement] DB Transaction started for ref: ${data.reference}`);
      let pr: any = null
      let excess = 0
      let remaining = 0
      let rentPortion = 0

      if (isVerified && data.type === 'RENT' && !data.paymentRequestId && data.userPropertyUuid) {
        const prop = await this.propertyRepo.findByUuid(data.userPropertyUuid, txClient)
        if (prop) {
          const existingPending = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING');
          const existingPartial = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL');
          const matchingPRs = [...existingPending, ...existingPartial].filter(p => p.userPropertyId === prop.id);

          if (matchingPRs.length > 0) {
            data.paymentRequestId = matchingPRs[0]?.id
            this.logger.log(`Linked manual rent payment to existing payment request: ${data.paymentRequestId}`)
          }
        }
      }

      if (isVerified && data.paymentRequestId) {
        pr = await this.paymentRequestRepo.findById(data.paymentRequestId)
        if (pr) {
          const prItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient);
          const rentRemaining = prItems.reduce((sum, item) => {
            const isFee = ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee'].includes(item.name);
            if (isFee) return sum;
            return sum + Math.max(0, item.totalAmount - item.amountPaid);
          }, 0);
          
          remaining = rentRemaining;
          if (pr.isManual) {
            (data as any).isManual = true
          }
        }
      }

      let upwardFeeAmount = 0;
      if (data.lineItemPayments && Array.isArray(data.lineItemPayments)) {
        const fee = data.lineItemPayments.find(lp => ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee'].includes(lp.name || ''));
        if (fee) upwardFeeAmount = Number(fee.amountPaid || 0);
      }

      if (upwardFeeAmount === 0 && pr) {
        const prItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient);
        const feeItem = prItems.find(i => ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee'].includes(i.name));
        if (feeItem) {
          const need = feeItem.totalAmount - feeItem.amountPaid;
          if (need > 0) {
            upwardFeeAmount = Math.min(data.amount, need);
            this.logger.log(`Prioritizing ${upwardFeeAmount} for ${feeItem.name} from payment ${data.reference}`);
          }
        }
      }

      let paymentAmount = pr ? Math.min(data.amount - upwardFeeAmount, remaining) + upwardFeeAmount : data.amount;

      if (pr) {
        excess = Math.max(0, data.amount - upwardFeeAmount - remaining);
      }

      let userPropertyIdToSettle: number | null = pr?.userPropertyId || null;
      let propertyForCycle: any = null;

      if (userPropertyIdToSettle) {
        propertyForCycle = await this.propertyRepo.findById(userPropertyIdToSettle, txClient);
      }

      if (!userPropertyIdToSettle && isVerified && data.type === 'RENT') {
        if (data.userPropertyUuid) {
          propertyForCycle = await this.propertyRepo.findByUuid(data.userPropertyUuid, txClient);
          if (propertyForCycle) {
            userPropertyIdToSettle = propertyForCycle.id!;
          }
        }

        // Final fallback: If user has only ONE property, link it to that
        if (!userPropertyIdToSettle && user) {
          const userProps = await this.propertyRepo.findByUserId(user.id!, txClient);
          if (userProps.length === 1) {
            propertyForCycle = userProps[0];
            userPropertyIdToSettle = propertyForCycle.id!;
          }
        }
      }

      // 1. Create Transaction (SUCCESS or FAILED based on verification)
      const result = await this.txRepo.create({
        ...data,
        userId: user.id!,
        amount: paymentAmount,
        status: isVerified ? 'SUCCESS' : 'FAILED',
        narration: data.narration || pr?.description || 'Property Payment',
        landlordId: data.landlordId || pr?.subaccount?.uuid || undefined,
      } as any, txClient)
      this.logger.log(`Transaction recorded successfully with ID: ${result.id}`)

      if (isVerified && result.status === 'SUCCESS') {
        rentPortion = Math.max(0, paymentAmount - upwardFeeAmount);

        if (pr) {

          const settlementPortion = Math.max(0, paymentAmount - upwardFeeAmount);
          const newAmountPaid = (pr.amountPaid || 0) + settlementPortion
        
          const currentItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient);
          const totalRentOwed = currentItems.reduce((sum, i) => {
             if (['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee'].includes(i.name)) return sum;
             return sum + i.totalAmount;
          }, 0);
          
          const newStatus = newAmountPaid >= totalRentOwed ? 'PAID' : 'PARTIAL'

          pr = await this.paymentRequestRepo.update(pr.id!, {
            amountPaid: Math.min(newAmountPaid, totalRentOwed),
            status: newStatus,
            paidAt: newStatus === 'PAID' ? new Date() : undefined,
          }, txClient)

          try {
            const pmPr = await this.pmPaymentRepo.findByPaymentRequestId(pr.id!, txClient);
            if (pmPr) {
              await this.pmPaymentRepo.update(pmPr.uuid, {
                amountPaid: Math.min(newAmountPaid, pr.amount),
                status: newStatus,
              }, txClient);


              await txClient.upward_pm_rent_payment.create({
                data: {
                  unitId: pmPr.unitId,
                  amount: paymentAmount,
                  paymentDate: new Date(),
                  method: 'PAYSTACK',
                  status: 'SUCCESS',
                  notes: `Payment for request ${pmPr.uuid.slice(-8)}`,
                  periodStart: pr.dueDate ? new Date(pr.dueDate) : null,
                }
              });

              if (newStatus === 'PAID') {
                const unit = await txClient.upward_pm_unit.findUnique({ where: { id: pmPr.unitId } });
                if (unit && unit.rentDueDate) {
                  const newDueDate = new Date(unit.rentDueDate);

                  newDueDate.setFullYear(newDueDate.getFullYear() + 1);

                  await txClient.upward_pm_unit.update({
                    where: { id: unit.id },
                    data: { rentDueDate: newDueDate }
                  });
                  this.logger.log(`Updated unit ${unit.id} due date to ${newDueDate.toISOString()}`);
                }
              }

              this.logger.log(`Updated PM payment request ${pmPr.uuid} and recorded history for core request ${pr.id}`);
            }
          } catch (err) {
            this.logger.error(`Failed to update PM payment request for core request ${pr.id}:`, err);
          }

          const itemsFromData = (data as any).lineItems;
          const itemsFromPayments = data.lineItemPayments;

          if (pr || (itemsFromData && Array.isArray(itemsFromData))) {
            let currentItems = pr ? await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient) : [];

            if (pr && currentItems.length === 0 && itemsFromData && Array.isArray(itemsFromData)) {
              await this.lineItemRepo.bulkCreate(itemsFromData.map((li: any) => ({
                paymentRequestId: pr.id!,
                name: li.label || li.name,
                totalAmount: li.amount,
                amountPaid: 0,
                status: 'PENDING'
              })), txClient);
              currentItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient);
            }

            rentPortion = 0;
            let remainingPayment = paymentAmount;
            const allocatedItems: any[] = [];
            let foundRentItem = false;

            if (pr && itemsFromPayments && Array.isArray(itemsFromPayments) && itemsFromPayments.length > 0) {
              for (const lp of itemsFromPayments) {
                const item = currentItems.find(i => i.id === lp.id || i.name === lp.name);
                const paymentToItem = Math.min(remainingPayment, lp.amountPaid);

                if (paymentToItem > 0) {
                  if (item) {
                    const newItemPaid = item.amountPaid + paymentToItem;
                    await this.lineItemRepo.update(item.id!, {
                      amountPaid: newItemPaid,
                      status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
                    }, txClient);

                    allocatedItems.push({
                      name: item.name,
                      label: item.name,
                      amount: paymentToItem,
                      category: 'Package'
                    });

                    if (item.name.toLowerCase().includes('rent')) {
                      if (!foundRentItem) {
                        rentPortion = 0;
                        foundRentItem = true;
                      }
                      rentPortion += paymentToItem;
                    }
                  } else if (lp.name) {
                    // Fallback: If item not in DB but client provided a name
                    allocatedItems.push({
                      name: lp.name,
                      label: lp.name,
                      amount: paymentToItem,
                      category: 'Package'
                    });

                    if (lp.name.toLowerCase().includes('rent')) {
                      if (!foundRentItem) {
                        rentPortion = 0;
                        foundRentItem = true;
                      }
                      rentPortion += paymentToItem;
                    }
                  }
                  remainingPayment -= paymentToItem;
                }
              }
            }

            // Case B: Fallback to greedy distribution (if no specific payments OR if payment remains)
            if (remainingPayment > 0 && currentItems.length > 0) {
              // Re-fetch to get updated amountPaid if Case A ran
              const itemsToAllocate = (itemsFromPayments && itemsFromPayments.length > 0)
                ? await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient)
                : currentItems;

              for (const item of itemsToAllocate) {
                if (remainingPayment <= 0) break;
                const isFee = ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee'].includes(item.name);
                const need = item.totalAmount - item.amountPaid;
                if (need <= 0 && !isFee) continue;
                const paymentToItem = Math.min(remainingPayment, need);
                if (paymentToItem > 0) {
                  const newItemPaid = item.amountPaid + paymentToItem;

                  // If it's a fee, we don't mark it as paid so it stays active for next time
                  if (!isFee) {
                    await this.lineItemRepo.update(item.id!, {
                      amountPaid: newItemPaid,
                      status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
                    }, txClient);
                  }

                  const existingAlloc = allocatedItems.find(a => a.name === item.name);
                  if (existingAlloc) {
                    existingAlloc.amount += paymentToItem;
                  } else {
                    allocatedItems.push({
                      name: item.name,
                      label: item.name,
                      amount: paymentToItem,
                      category: 'Package'
                    });
                  }

                  if (item.name.toLowerCase().includes('rent')) {
                    if (!foundRentItem) {
                      rentPortion = 0; // First time we find a rent item, reset the default
                      foundRentItem = true;
                    }
                    rentPortion += paymentToItem;
                  }
                  remainingPayment -= paymentToItem;
                }
              }
            }

            // Case C: Manual payment with line items but no Payment Request
            if (!pr && itemsFromData && Array.isArray(itemsFromData) && itemsFromData.length > 0) {
              for (const li of itemsFromData) {
                if (remainingPayment <= 0) break;
                const paymentToItem = Math.min(remainingPayment, li.amount);
                allocatedItems.push({
                  name: li.label || li.name,
                  label: li.label || li.name,
                  amount: paymentToItem,
                  category: 'Package'
                });
                if ((li.label || li.name || '').toLowerCase().includes('rent')) {
                  if (!foundRentItem) {
                    rentPortion = 0;
                    foundRentItem = true;
                  }
                  rentPortion += paymentToItem;
                }
                remainingPayment -= paymentToItem;
              }
            }

            if (allocatedItems.length === 0 && data.type === 'RENT') {
              const defaultName = pr?.description || data.narration || 'Rent Payment';

              let propRent = 0;
              if (data.userPropertyUuid) {
                const p = await this.propertyRepo.findByUuid(data.userPropertyUuid, txClient);
                if (p) propRent = p.rentAmount;
              }

              if (propRent > 0 && paymentAmount > propRent) {

                allocatedItems.push({
                  name: 'Rent Payment',
                  label: 'Rent Payment',
                  amount: propRent,
                  category: 'Rent'
                });
                allocatedItems.push({
                  name: 'Service Charge / Other',
                  label: 'Service Charge / Other',
                  amount: paymentAmount - propRent,
                  category: 'Package'
                });
                rentPortion = propRent;
              } else {
                allocatedItems.push({
                  name: defaultName,
                  label: defaultName,
                  amount: Math.max(0, paymentAmount - upwardFeeAmount),
                  category: 'Rent'
                });
                if (upwardFeeAmount > 0) {
                  allocatedItems.push({
                    name: 'Processing Fee',
                    label: 'Processing Fee',
                    amount: upwardFeeAmount,
                    category: 'Package'
                  });
                }
                rentPortion = Math.max(0, paymentAmount - upwardFeeAmount);
              }
            }

            // Update the transaction record with captured line items
            if (allocatedItems.length > 0) {
              await this.txRepo.update(result.id, {
                lineItems: allocatedItems
              }, txClient)
              result.lineItems = allocatedItems
            }
          }

          // 4. Handle Excess as Overpayment
          if (excess > 0) {
            const futureCreditRef = `FC_${data.reference}`
            const existingFc = await this.txRepo.findByReference(futureCreditRef, txClient)
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
              } as any, txClient)

              await this.overpaymentRepo.create({
                userId: user.id!,
                amount: excess,
                currency: data.currency || 'NGN',
                transactionId: result.id,
                paymentRequestId: pr.id,
                status: 'AVAILABLE',
              }, txClient)
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
          const prop = await this.propertyRepo.findById(userPropertyIdToSettle, txClient)
          if (prop) {
            const totalRentPaidForProp = (prop.amountPaid || 0) + rentPortion
            const totalOwedForProp = prop.rentAmount || (pr ? (pr.amount - (upwardFeeAmount || 0)) : 0)
            const newRemaining = Math.max(0, totalOwedForProp - totalRentPaidForProp)

            const updateData: any = {
              amountPaid: totalRentPaidForProp,
              amountRemaining: newRemaining
            }

            if (rentPortion > 0 && newRemaining === 0 && totalRentPaidForProp >= totalOwedForProp && totalOwedForProp > 0) {
              const overpayment = totalRentPaidForProp - totalOwedForProp;

              if (prop.rentEndDate) {
                const newDate = new Date(prop.rentEndDate)
                newDate.setFullYear(newDate.getFullYear() + 1)
                updateData.rentEndDate = newDate
                updateData.isPastTenancy = false

                const nextYearRent = prop.rentAmount || totalOwedForProp;
                updateData.amountPaid = overpayment;
                updateData.amountRemaining = Math.max(0, nextYearRent - overpayment);

                this.logger.log(`Property ${prop.uuid} fully settled. Rent due date moved to ${newDate.toISOString()}. Resetting for next cycle with ${overpayment} overpayment carried over.`)
              }

              await txClient.upward_notification.create({
                data: {
                  userId: user.id!,
                  title: 'Credit Score Boost!',
                  message: `Congratulations! Your full rent payment for ${data.propertyAddress || 'your property'} has boosted your credit health.`,
                  type: 'SYSTEM'
                }
              })

              await txClient.upward_notification.updateMany({
                where: {
                  userId: user.id!,
                  type: { in: ['RENT_REMINDER', 'PAYMENT'] },
                  OR: [
                    { message: { contains: prop.uuid } },
                    { url: { contains: prop.uuid } }
                  ]
                },
                data: { isRead: true }
              })
            }

            // --- 6. Rent Cycle Source of Truth Update ---
            const cycleDueDate = pr ? new Date(pr.dueDate) : (prop.rentEndDate ? new Date(prop.rentEndDate) : new Date())
            const paidAt = new Date()

            // amountOwed should be the specific request amount if it's a PR, or the property rent if manual
            const amountOwedForCycle = pr ? pr.amount : (prop.rentAmount || 0);

            const currentTotalPaid = pr ? (pr.amountPaid || 0) + rentPortion : rentPortion;
            const cycleStatus = currentTotalPaid >= amountOwedForCycle
              ? (paidAt <= cycleDueDate ? 'PAID_ON_TIME' : 'PAID_LATE')
              : (paidAt <= cycleDueDate ? 'PARTIAL_ON_TIME' : 'PARTIAL_LATE')

            if (pr) {
              await this.rentCycleRepo.upsertByPaymentRequestId(pr.id!, {
                userId: user.id!,
                userPropertyId: prop.id,
                amountOwed: amountOwedForCycle,
                amountPaid: (pr.amountPaid || 0) + rentPortion,
                currency: data.currency || prop.currency || 'NGN',
                dueDate: cycleDueDate,
                paidAt: paidAt,
                status: cycleStatus,
                source: 'PAYMENT_REQUEST',
                description: pr.description
              }, txClient)
            } else {
              // Manual match based on property and due date
              const existingCycles = await this.rentCycleRepo.findByUserId(user.id!, txClient)
              const matchingCycle = existingCycles.find(c =>
                c.userPropertyId === prop.id &&
                new Date(c.dueDate).getTime() === cycleDueDate.getTime()
              )

              if (matchingCycle && matchingCycle.id) {
                await this.rentCycleRepo.update(matchingCycle.id, {
                  amountPaid: (matchingCycle.amountPaid || 0) + rentPortion,
                  status: cycleStatus,
                  paidAt: paidAt
                }, txClient)
              } else {
                await this.rentCycleRepo.create({
                  userId: user.id!,
                  userPropertyId: prop.id!,
                  amountOwed: amountOwedForCycle,
                  amountPaid: rentPortion,
                  currency: data.currency || prop.currency || 'NGN',
                  dueDate: cycleDueDate,
                  paidAt: paidAt,
                  status: cycleStatus,
                  source: 'MANUAL',
                  description: `Rent payment for ${prop.location?.address || 'property'}`
                }, txClient)
              }
            }

            // Always update the master property record
            await this.propertyRepo.update(prop.id!, updateData, txClient)
          }
        }
      }
      if (result.status === 'SUCCESS' && pr?.platformId && rentPortion > 0) {
        try {
          // Calculate Rent-specific totals for the webhook
          const currentItems = await this.lineItemRepo.findByPaymentRequestId(pr.id!, txClient);
          const rentItems = currentItems.filter(i => i.name.toLowerCase().includes('rent'));

          let totalRentPaid = rentItems.reduce((sum, i) => sum + i.amountPaid, 0);
          let totalRentAmount = rentItems.reduce((sum, i) => sum + i.totalAmount, 0);

          // Fallback if no specific line items found at all (treat whole PR as rent if type is RENT)
          if (rentItems.length === 0 && currentItems.length === 0 && data.type === 'RENT') {
            totalRentPaid = pr.amountPaid || 0;
            totalRentAmount = pr.amount;
          }

          const statusForWebhook = totalRentPaid >= totalRentAmount ? 'PAID' : 'PARTIAL';
          const remainingAmount = Math.max(0, totalRentAmount - totalRentPaid);

          const isFirstPayment = (pr.amountPaid || 0) === 0;
          const webhookPayload: any = {
            paymentUuid: pr.uuid,
            reference: result.reference,
            amountPaid: rentPortion,
            totalPaid: totalRentPaid,
            remainingAmount: remainingAmount,
            overpaymentAmount: excess,
            currency: result.currency || pr.currency || 'NGN',
            status: statusForWebhook,
            paidAt: new Date(),
            customerEmail: user.email
          };

          if (isFirstPayment && propertyForCycle) {
            webhookPayload.rentStartDate = propertyForCycle.rentStartDate;
            webhookPayload.rentEndDate = propertyForCycle.rentEndDate;
          }

          this.eventBus.publish(new PaymentUpdatedEvent(
            pr.platformId,
            'payment.updated',
            webhookPayload
          ));
          this.logger.log(`Payment webhook event 'payment.updated' (${statusForWebhook}) published for platform ${pr.platformId}`);
        } catch (e) {
          this.logger.error(`Failed to publish payment success event: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      this.logger.log(`[Settlement] Transaction committed for ref: ${data.reference}`);
      return result;
    }, {
      timeout: 15000 // Increase timeout to 15s for large transactions
    })
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

    // We still find active requests to flag 'hasActiveRequest'
    const propRequests = [...allPending, ...allPartial].filter(p => p.userPropertyId === prop.id)
    const requestTotal = propRequests.reduce((sum, pr) => sum + pr.amount, 0)

    // Source of Truth: The property record fields themselves (settled by RecordTransactionUseCase)
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
