import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  PM_PAYMENT_REQUEST_REPOSITORY,
  IPmPaymentRequestRepository,
} from '../../../domains/pm/IPropertyRepository'
import {
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentLineItemRepository,
} from '../../../domains/payments/payment.repository'

@Injectable()
export class SyncPmPaymentStatusUseCase {
  private readonly logger = new Logger(SyncPmPaymentStatusUseCase.name)

  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
  ) {}

  async execute(params: {
    paymentRequestId: number
    rentPortion: number
    txClient: any
  }) {
    const { paymentRequestId, rentPortion, txClient } = params

    try {
      const pmPr = await this.pmPaymentRepo.findByPaymentRequestId(paymentRequestId, txClient)
      if (!pmPr) return

      const pr = await this.paymentRequestRepo.findById(paymentRequestId, txClient)
      if (!pr) return

      // Update PM request status
      await this.pmPaymentRepo.update(pmPr.uuid, {
        amountPaid: pr.amountPaid, // Status and amountPaid come from the core PR which was already updated
        status: pr.status,
      }, txClient)

      if (rentPortion > 0) {
        // Record in PM Rent History
        await txClient.upward_pm_rent_payment.create({
          data: {
            unitId: pmPr.unitId,
            tenantId: pmPr.tenantId,
            amount: rentPortion,
            paymentDate: new Date(),
            method: 'PAYSTACK',
            status: 'SUCCESS',
            notes: `Rent Portion for request ${pmPr.uuid.slice(-8)}`,
            periodStart: pr.rentStartDate ? new Date(pr.rentStartDate) : (pr.dueDate ? new Date(pr.dueDate) : null),
            periodEnd: pr.rentEndDate ? new Date(pr.rentEndDate) : null,
          }
        })

        // Advance Due Date logic
        const allItems = await this.lineItemRepo.findByPaymentRequestId(paymentRequestId, txClient)
        const rentItems = allItems.filter(i => 
          i.name.toLowerCase().includes('rent') || 
          i.name.toLowerCase().includes('lease') ||
          i.name.toLowerCase().includes('tenancy')
        )

        const isRentFullyPaid = rentItems.length > 0 && rentItems.every(i => i.status === 'PAID')

        if (isRentFullyPaid) {
          const unit = await txClient.upward_pm_unit.findUnique({ where: { id: pmPr.unitId } })
          if (unit && unit.rentDueDate) {
            const newDueDate = pmPr.rentEndDate ? new Date(pmPr.rentEndDate) : new Date(unit.rentDueDate)
            
            if (!pmPr.rentEndDate) {
              if (pmPr.rentType === 'MONTHLY') {
                newDueDate.setMonth(newDueDate.getMonth() + 1)
              } else {
                newDueDate.setFullYear(newDueDate.getFullYear() + 1)
              }
            }

            await txClient.upward_pm_unit.update({
              where: { id: unit.id },
              data: { rentDueDate: newDueDate }
            })
            this.logger.log(`Rent fully paid for unit ${unit.id}. Advanced PM due date to ${newDueDate.toISOString()}`)
          }
        }
      }
    } catch (err) {
      this.logger.error(`Failed to sync PM payment status for core request ${paymentRequestId}:`, err)
    }
  }
}
