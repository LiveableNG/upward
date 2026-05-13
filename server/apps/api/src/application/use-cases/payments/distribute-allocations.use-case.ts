import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentLineItemRepository,
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../../domains/payments/payment.repository'
import { LineItemPayment } from './payment.use-cases'

@Injectable()
export class DistributePaymentAllocationsUseCase {
  private readonly logger = new Logger(DistributePaymentAllocationsUseCase.name)

  constructor(
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
  ) {}

  async execute(params: {
    transactionId: number
    paymentRequestId?: number
    amount: number
    upwardFeeAmount: number
    lineItemPayments?: LineItemPayment[]
    manualLineItems?: any[]
    narration?: string
    txClient?: any
  }) {
    const { transactionId, paymentRequestId, amount, upwardFeeAmount, lineItemPayments, manualLineItems, narration, txClient } = params
    
    let rentPortion = 0
    let remainingPayment = amount
    const allocatedItems: any[] = []
    let foundRentItem = false

    const currentItems = paymentRequestId 
      ? await this.lineItemRepo.findByPaymentRequestId(paymentRequestId, txClient) 
      : []

    // 1. Process client-provided allocations
    if (lineItemPayments && lineItemPayments.length > 0) {
      for (const lp of lineItemPayments) {
        const item = currentItems.find(i => i.id === lp.id || i.name === lp.name)
        const paymentToItem = Math.min(remainingPayment, lp.amountPaid)

        if (paymentToItem > 0) {
          if (item) {
            const newItemPaid = item.amountPaid + paymentToItem
            await this.lineItemRepo.update(item.id!, {
              amountPaid: newItemPaid,
              status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
            }, txClient)

            allocatedItems.push({
              name: item.name,
              label: item.name,
              amount: paymentToItem,
              category: 'Package'
            })

            if (item.name.toLowerCase().includes('rent')) {
              if (!foundRentItem) { rentPortion = 0; foundRentItem = true }
              rentPortion += paymentToItem
            }
          } else if (lp.name) {
            allocatedItems.push({
              name: lp.name,
              label: lp.name,
              amount: paymentToItem,
              category: 'Package'
            })

            if (lp.name.toLowerCase().includes('rent')) {
              if (!foundRentItem) { rentPortion = 0; foundRentItem = true }
              rentPortion += paymentToItem
            }
          }
          remainingPayment -= paymentToItem
        }
      }
    }

    // 2. Auto-allocate remaining balance if there's still money and items in DB
    if (remainingPayment > 0 && currentItems.length > 0) {
      const itemsToAllocate = [...currentItems].sort((a, b) => {
        const aIsRent = a.name.toLowerCase().includes('rent')
        const bIsRent = b.name.toLowerCase().includes('rent')
        if (aIsRent && !bIsRent) return -1
        if (!aIsRent && bIsRent) return 1
        return 0
      })

      for (const item of itemsToAllocate) {
        if (remainingPayment <= 0) break
        const isFee = ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee'].includes(item.name)
        const need = item.totalAmount - item.amountPaid
        if (need <= 0 && !isFee) continue
        
        const paymentToItem = Math.min(remainingPayment, need)
        if (paymentToItem > 0) {
          const newItemPaid = item.amountPaid + paymentToItem

          if (!isFee) {
            await this.lineItemRepo.update(item.id!, {
              amountPaid: newItemPaid,
              status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
            }, txClient)
          }

          const existingAlloc = allocatedItems.find(a => a.name === item.name)
          if (existingAlloc) {
            existingAlloc.amount += paymentToItem
          } else {
            allocatedItems.push({
              name: item.name,
              label: item.name,
              amount: paymentToItem,
              category: 'Package'
            })
          }

          if (item.name.toLowerCase().includes('rent')) {
            if (!foundRentItem) { rentPortion = 0; foundRentItem = true }
            rentPortion += paymentToItem
          }
          remainingPayment -= paymentToItem
        }
      }
    }

    // 3. Handle manual items (Case C from monolith)
    if (!paymentRequestId && manualLineItems && manualLineItems.length > 0) {
      for (const li of manualLineItems) {
        if (remainingPayment <= 0) break
        const paymentToItem = Math.min(remainingPayment, li.amount)
        allocatedItems.push({
          name: li.label || li.name,
          label: li.label || li.name,
          amount: paymentToItem,
          category: 'Package'
        })
        if ((li.label || li.name || '').toLowerCase().includes('rent')) {
          if (!foundRentItem) { rentPortion = 0; foundRentItem = true }
          rentPortion += paymentToItem
        }
        remainingPayment -= paymentToItem
      }
    }

    // 4. Fallback: If nothing was allocated but it's a RENT payment
    if (allocatedItems.length === 0) {
      const defaultName = narration || 'Rent Payment'
      allocatedItems.push({
        name: defaultName,
        label: defaultName,
        amount: Math.max(0, amount - upwardFeeAmount),
        category: 'Rent'
      })
      if (upwardFeeAmount > 0) {
        allocatedItems.push({
          name: 'Processing Fee',
          label: 'Processing Fee',
          amount: upwardFeeAmount,
          category: 'Package'
        })
      }
      rentPortion = Math.max(0, amount - upwardFeeAmount)
    }

    // Update Transaction with finalized line items
    if (allocatedItems.length > 0) {
      await this.txRepo.update(transactionId, {
        lineItems: allocatedItems
      }, txClient)
    }

    return { allocatedItems, rentPortion, remainingPayment }
  }
}
