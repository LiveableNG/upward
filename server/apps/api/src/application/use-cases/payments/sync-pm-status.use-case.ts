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
            let shouldAdvanceDates = false;

            if (pmPr.isRecurring) {
              shouldAdvanceDates = true;
            } else if (pmPr.rentStartDate && new Date(pmPr.rentStartDate) >= new Date(unit.rentDueDate)) {
              shouldAdvanceDates = true;
            }

            let newStartDate = new Date(unit.rentStartDate || new Date());
            let newDueDate = new Date(unit.rentDueDate);
            const baseDate = pmPr.rentEndDate ? new Date(pmPr.rentEndDate) : new Date(unit.rentDueDate);

            if (shouldAdvanceDates) {
              newStartDate = new Date(baseDate);
              newStartDate.setDate(newStartDate.getDate() + 1);

              newDueDate = new Date(newStartDate);
              const rentInterval = pmPr.rentType || unit.rentType;
              if (rentInterval === 'MONTHLY' || rentInterval === 'Monthly') {
                newDueDate.setMonth(newDueDate.getMonth() + 1);
              } else {
                newDueDate.setFullYear(newDueDate.getFullYear() + 1);
              }
              newDueDate.setDate(newDueDate.getDate() - 1);

              await txClient.upward_pm_unit.update({
                where: { id: unit.id },
                data: { 
                  rentDueDate: newDueDate,
                  rentStartDate: newStartDate
                }
              });
              this.logger.log(`Rent fully paid for unit ${unit.id}. Advanced PM due date from ${baseDate.toISOString()} to ${newDueDate.toISOString()}`);
            } else {
              this.logger.log(`Rent fully paid for unit ${unit.id}, but dates were NOT advanced (Payment was for the current active balance).`);
            }

            if (unit.userPropertyUuid) {
              await txClient.upward_user_property.updateMany({
                where: { uuid: unit.userPropertyUuid },
                data: {
                  rentStartDate: newStartDate,
                  rentEndDate: newDueDate
                }
              })
              this.logger.log(`Advanced UpwardPay rent dates for user property ${unit.userPropertyUuid}`)
            }

            if (pmPr.isRecurring && pmPr.recurrenceInterval) {
              const interval = pmPr.recurrenceInterval;
              
              let nextScheduledAt: Date | null = null;
              let nextDueDate: Date | null = null;
              let nextRentStart: Date | null = null;
              let nextRentEnd: Date | null = null;

              const advanceDate = (date: Date, intervalStr: string): Date => {
                const d = new Date(date);
                if (intervalStr === 'MONTHLY') d.setMonth(d.getMonth() + 1);
                else if (intervalStr === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
                else if (intervalStr === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
                return d;
              };

              if (pmPr.scheduledAt) nextScheduledAt = advanceDate(pmPr.scheduledAt, interval);
              if (pmPr.dueDate) nextDueDate = advanceDate(pmPr.dueDate, interval);
              if (pmPr.rentStartDate) nextRentStart = advanceDate(pmPr.rentStartDate, interval);
              if (pmPr.rentEndDate) nextRentEnd = advanceDate(pmPr.rentEndDate, interval);

              await txClient.upward_pm_payment_request.create({
                data: {
                  pmId: pmPr.pmId,
                  unitId: pmPr.unitId,
                  tenantId: pmPr.tenantId,
                  paymentRequestId: null,
                  amount: pmPr.amount,
                  currency: pmPr.currency || 'NGN',
                  description: pmPr.description,
                  dueDate: nextDueDate || new Date(),
                  rentStartDate: nextRentStart,
                  rentEndDate: nextRentEnd,
                  rentType: pmPr.rentType,
                  reminderFrequency: pmPr.reminderFrequency,
                  nextReminderAt: null,
                  reminderCount: 0,
                  status: 'SCHEDULED',
                  amountPaid: 0,
                  allowPartial: pmPr.allowPartial,
                  minAmount: pmPr.minAmount,
                  scheduledAt: nextScheduledAt,
                  isRecurring: true,
                  recurrenceInterval: interval
                }
              });
              
              this.logger.log(`Created recurring clone for request ${pmPr.uuid} scheduled for ${nextScheduledAt}`);
            }
          }
        }
      }
    } catch (err) {
      this.logger.error(`Failed to sync PM payment status for core request ${paymentRequestId}:`, err)
    }
  }
}
