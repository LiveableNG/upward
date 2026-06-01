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
    sequentialFill?: boolean // Fill line items top-to-bottom (by sortOrder) instead of proportionally
    txClient?: any
  }) {
    const { transactionId, paymentRequestId, amount, upwardFeeAmount, lineItemPayments, manualLineItems, narration, sequentialFill, txClient } = params
    
    let rentPortion = 0
    let remainingPayment = amount
    const allocatedItems: any[] = []
    let foundRentItem = false

    const currentItems = paymentRequestId 
      ? await this.lineItemRepo.findByPaymentRequestId(paymentRequestId, txClient) 
      : []

    // 0. Deduct Upward Fee first if specified and not already in allocations
    // This ensures the fee is prioritized and doesn't "steal" from rent/mgt portions incorrectly
    if (upwardFeeAmount > 0) {
      const feeInAllocations = lineItemPayments?.find(lp => 
        lp.name === 'Processing Fee' || 
        lp.name === 'Transaction Fee' ||
        lp.name === 'Upward Benefits' ||
        ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(lp.name || '')
      )
      
      if (!feeInAllocations) {
        const feeToPay = Math.min(remainingPayment, upwardFeeAmount)
        allocatedItems.push({
          name: 'Processing Fee',
          label: 'Processing Fee',
          amount: feeToPay,
          category: 'Fee'
        })
        remainingPayment -= feeToPay
        this.logger.log(`Deducted Processing Fee: ${feeToPay}. Remaining for items: ${remainingPayment}`)
      }
    }

    // 1. Process client-provided allocations
    if (lineItemPayments && lineItemPayments.length > 0) {
      for (const lp of lineItemPayments) {
        if (remainingPayment <= 0) break

        const lpName = (lp.name || '').toLowerCase().trim()
        const item = currentItems.find(i => {
          if (i.id === lp.id) return true
          const iName = (i.name || '').toLowerCase().trim()
          if (iName === lpName) return true
          
          // Handle common abbreviations
          if (lpName === 'mgt fee' && iName === 'management fee') return true
          if (lpName === 'management fee' && iName === 'mgt fee') return true
          
          return false
        })
        const isFee = lp.name === 'Processing Fee' || 
                     lp.name === 'Transaction Fee' ||
                     lp.name === 'Upward Benefits' ||
                     (item && ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(item.name))
        
        const lpAmount = Number(lp.amountPaid || lp.amount || 0)
        
        // Cap by item's need to prevent overpayment of one item at the expense of others
        const itemNeed = item ? Math.max(0, item.totalAmount - item.amountPaid) : (isFee ? lpAmount : Infinity)
        const paymentToItem = Math.min(remainingPayment, lpAmount, itemNeed)

        if (paymentToItem > 0) {
          if (item) {
            const newItemPaid = item.amountPaid + paymentToItem
            await this.lineItemRepo.update(item.id!, {
              amountPaid: newItemPaid,
              status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
            }, txClient)

            const existingAlloc = allocatedItems.find(a => a.name === item.name)
            if (existingAlloc) {
              existingAlloc.amount += paymentToItem
            } else {
              allocatedItems.push({
                name: item.name,
                label: item.name,
                amount: paymentToItem,
                category: isFee ? 'Fee' : 'Package'
              })
            }

            if (item.name.toLowerCase().includes('rent')) {
              if (!foundRentItem) { rentPortion = 0; foundRentItem = true }
              rentPortion += paymentToItem
            }
          } else if (lp.name) {
            const existingAlloc = allocatedItems.find(a => a.name === lp.name)
            if (existingAlloc) {
              existingAlloc.amount += paymentToItem
            } else {
              allocatedItems.push({
                name: lp.name,
                label: lp.name,
                amount: paymentToItem,
                category: isFee ? 'Fee' : 'Package'
              })
            }

            if (lp.name.toLowerCase().includes('rent')) {
              if (!foundRentItem) { rentPortion = 0; foundRentItem = true }
              rentPortion += paymentToItem
            }
          }
          remainingPayment -= paymentToItem
        }
      }
    }

    // 2. Auto-allocate remaining balance across all unpaid items.
    // IMPORTANT: Skip this step if the caller provided explicit manual lineItemPayments.
    // When sequentialFill=true (DVA payment with no stored intent + allowPartial), fill items
    // top-to-bottom by sortOrder — this matches the most likely tenant intent.
    // Otherwise (no manual allocations, no sequential flag), distribute proportionally.
    const hasManualAllocations = lineItemPayments && lineItemPayments.length > 0
    if (!hasManualAllocations && remainingPayment > 0 && currentItems.length > 0) {
      const unpaidItems = currentItems
        .filter(item => {
          const isFee = ['Upward Processing Fee', 'Upward & Provider Fee', 'Processing Fee', 'Transaction Fee', 'Upward Benefits'].includes(item.name)
          const need = item.totalAmount - item.amountPaid
          return !isFee && need > 0
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

      const totalOutstanding = unpaidItems.reduce((sum, item) => sum + (item.totalAmount - item.amountPaid), 0)

      if (totalOutstanding > 0) {
        const distributableAmount = Math.min(remainingPayment, totalOutstanding)
        let distributed = 0

        if (sequentialFill) {
          // --- Sequential Fill: pay items in sortOrder, one at a time ---
          this.logger.log(`Sequential-filling ${distributableAmount} across ${unpaidItems.length} line items (no checkout intent, allowPartial)`)
          for (const item of unpaidItems) {
            if (remainingPayment <= 0) break
            const need = item.totalAmount - item.amountPaid
            const paymentToItem = Math.min(remainingPayment, need)

            this.logger.log(`Sequential: Allocating ${paymentToItem} to "${item.name}" (need: ${need})`)

            if (paymentToItem > 0) {
              const newItemPaid = item.amountPaid + paymentToItem
              await this.lineItemRepo.update(item.id!, {
                amountPaid: newItemPaid,
                status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
              }, txClient)

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
              distributed += paymentToItem
              remainingPayment -= paymentToItem
            }
          }
        } else {
          // --- Proportional Fill ---
          this.logger.log(`Auto-allocating ${remainingPayment} across ${unpaidItems.length} line items (proportional)`)
          for (let i = 0; i < unpaidItems.length; i++) {
            const item = unpaidItems[i]!
            const need = item.totalAmount - item.amountPaid

            let paymentToItem: number
            if (i === unpaidItems.length - 1) {
              paymentToItem = Math.min(need, distributableAmount - distributed)
            } else {
              paymentToItem = Math.min(need, Math.round((need / totalOutstanding) * distributableAmount))
            }

            this.logger.log(`Allocating ${paymentToItem} to "${item.name}" (need: ${need}, share: ${((need / totalOutstanding) * 100).toFixed(1)}%)`)

            if (paymentToItem > 0) {
              const newItemPaid = item.amountPaid + paymentToItem
              await this.lineItemRepo.update(item.id!, {
                amountPaid: newItemPaid,
                status: newItemPaid >= item.totalAmount ? 'PAID' : 'PARTIAL'
              }, txClient)

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
              distributed += paymentToItem
              remainingPayment -= paymentToItem
            }
          }
        }
      }
    }

    if (upwardFeeAmount > 0 && !allocatedItems.find(a => a.name === 'Processing Fee')) {
      allocatedItems.push({
        name: 'Processing Fee',
        label: 'Processing Fee',
        amount: upwardFeeAmount,
        category: 'Fee'
      })
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

    // 5. Handle any remaining balance as Excess / Future Credit
    if (remainingPayment > 0) {
      const label = 'Excess / Future Credit'
      const existingAlloc = allocatedItems.find(a => a.name === label)
      if (existingAlloc) {
        existingAlloc.amount += remainingPayment
      } else {
        allocatedItems.push({
          name: label,
          label: label,
          amount: remainingPayment,
          category: 'Overpayment'
        })
      }
      this.logger.log(`Added remaining ${remainingPayment} to Excess / Future Credit`)
      remainingPayment = 0
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
